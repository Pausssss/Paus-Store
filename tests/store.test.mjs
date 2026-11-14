import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function setup(mode='fallback',rpc=async()=>({id:'SERVER-01'})){
  const memory=new Map(),listeners=new Map();
  const toast={textContent:'',classList:{add(){},remove(){}}};
  const context={console,Intl,Date,URL,URLSearchParams,Math,JSON,Number,String,Boolean,Array,Map,Set,Promise,encodeURIComponent,
    location:{hostname:'localhost',pathname:'/shop.html',protocol:'http:'},navigator:{},
    setTimeout(){return 1;},clearTimeout(){},
    localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},
    document:{body:{dataset:{},appendChild(){}},getElementById:id=>id==='toast'?toast:null,querySelectorAll:()=>[],addEventListener:(event,callback)=>listeners.set(event,callback)},
    PAUS_BOOT(){},PAUS_BACKEND:{getMode:()=>mode,createOrder:rpc}};
  context.window=context;vm.createContext(context);
  vm.runInContext(read('assets/data/config.js')+read('assets/data/products.js')+read('assets/js/core/catalog.js'),context);
  vm.runInContext(read('assets/js/core/store.js')+';this.api=PAUS;this.catalog=PRODUCTS;',context);
  return{api:context.api,memory,context,items:context.catalog};
}
test('grouped catalog retains distinct model ids, slugs and valid local images',()=>{
  const {items}=setup();assert.equal(items.length,1003);assert.equal(new Set(items.map(p=>p.id)).size,items.length);assert.equal(new Set(items.map(p=>p.slug)).size,items.length);
  let variants=0;
  for(const p of items){assert.ok(p.name&&p.brand&&p.category);assert.equal(new Set(p.variants.map(v=>v.id)).size,p.variants.length);
    for(const v of [p,...p.variants]){if(v!==p)variants++;for(const image of [v.image,...v.gallery||[]]){const path=resolve(new URL('..',import.meta.url).pathname,image.replace(/^\//,''));assert.ok(existsSync(path)&&statSync(path).size>0,`${p.id}: ${image}`);}for(const raw of Object.values(v.sizes||{}))assert.ok(Number(raw?.price??raw)>0);}
  }assert.ok(variants>=1003);
});
test('variant and size prices stay separate and quantities respect variant stock',()=>{
  const{api}=setup();const p=api.product(1),a=p.variants[0],b=p.variants[1];
  const sizeA=Object.keys(a.sizes)[0],sizeB=Object.keys(b.sizes)[0];
  api.addCart(p.id,a.id,sizeA,1);api.addCart(p.id,b.id,sizeB,2);
  assert.equal(api.cart().length,2);assert.equal(api.cartSubtotal(),api.sizePrice(p,a.id,sizeA)+2*api.sizePrice(p,b.id,sizeB));
  api.updateCart(p.id,b.id,sizeB,999);assert.equal(api.cart()[1].qty,Math.min(20,b.stock));
  api.removeCart(p.id,a.id,sizeA);assert.equal(api.cart().length,1);api.clearCart();assert.equal(api.cartCount(),0);
});
test('corrupted storage and retired variants do not become another size or product',()=>{
  const{api,memory}=setup();memory.set('paus_fashion_cart_v6','{"wrong":"shape"}');assert.equal(api.cartCount(),0);
  memory.set('paus_fashion_cart_v6',JSON.stringify([null,{id:1,variant:'retired',size:'230',qty:1},{id:1,variant:'trang',size:'no-such-size',qty:1},{id:1,variant:'trang',size:'230',qty:-5}]));assert.equal(api.cart().length,0);
});
test('wishlist toggles are persistent and product HTML escapes supplied content',()=>{
  const{api}=setup();assert.equal(api.toggleWish(1),true);assert.equal(api.wishlist().length,1);assert.equal(api.toggleWish(1),false);assert.equal(api.wishlist().length,0);
  const markup=api.card({...api.product(1),name:'<script>bad()</script> "hello"'});assert.ok(!markup.includes('<script>bad()'));assert.ok(markup.includes('&lt;script&gt;'));assert.ok(markup.includes('aria-pressed="false"'));
});
test('offline order is explicitly a local draft and retains the shopping cart',async()=>{
  const{api}=setup();api.addCart(1,'trang','230',1);const before=api.cartCount();
  const order=await api.createOrder({customer:{name:'Kiểm thử'},items:[],total:1690000,status:'Chờ xác nhận'});
  assert.equal(order.localOnly,true);assert.match(order.status,/chưa gửi/);assert.match(order.id,/^NHAP-/);assert.equal(api.cartCount(),before);assert.equal(api.orders().length,1);
});
test('server errors and invalid confirmations never save a successful local order',async()=>{
  for(const fn of [async()=>{throw new Error('Disconnected');},async()=>({})]){
    const{api}=setup('supabase',fn);await assert.rejects(api.createOrder({items:[]}));assert.equal(api.orders().length,0);
  }
});
test('only confirmed server response is recorded as a received order',async()=>{
  const{api}=setup('supabase',async()=>({id:'PAUS-SERVER-01',status:'Chờ xác nhận',total:123}));const order=await api.createOrder({items:[]});assert.equal(order.id,'PAUS-SERVER-01');assert.ok(!order.localOnly);assert.equal(api.orders()[0].total,123);
});
test('storefront hides generated instructions while keeping genuine product descriptions',()=>{
  const{api}=setup();assert.equal(api.productDescription({description:'Nike V2K. Chọn size/phiên bản đang có sẵn để đặt hàng.'}),'');
  assert.equal(api.productDescription({description:'Áo cotton, phom rộng và cổ tròn.'}),'Áo cotton, phom rộng và cổ tròn.');
});
