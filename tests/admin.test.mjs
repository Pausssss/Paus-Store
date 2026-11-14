import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function data(){const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('assets/js/admin/data.js'),ctx);return ctx.window.PAUS_ADMIN_DATA;}
function api({tables={},session=null,admin=null,refreshFails=false}={}){
 const requests=[],writes=[];let signedOut=false;
 const client={auth:{getSession:async()=>({data:{session},error:null}),signOut:async()=>{signedOut=true;}},from(table){
  const filters=[];let payload=null;
  const q={select(){return q;},order(){return q;},eq(key,value){filters.push([key,value]);return q;},
   range:async(start,end)=>{requests.push({table,start,end});return{data:(tables[table]||[]).filter(row=>filters.every(([k,v])=>row[k]===v)).slice(start,end+1),error:null};},
   update(value){payload=value;return q;},insert(value){payload=value;return q;},
   single:async()=>{writes.push(payload);return{data:{id:77,...payload},error:null};},
   maybeSingle:async()=>({data:admin,error:null})};return q;
 }};
 const backend={getClient:()=>client,isConfigured:()=>true,normalizeProduct:row=>row,refreshCatalog:async()=>{if(refreshFails)throw new Error('Refresh failed');}};
 const ctx={window:{PAUS_BACKEND:backend},location:{hostname:'store.example'},PRODUCTS:[],PAUS:{orders:()=>[]},console};vm.createContext(ctx);vm.runInContext(read('assets/js/admin/api.js'),ctx);
 return{api:ctx.window.PAUS_ADMIN_API,requests,writes,get signedOut(){return signedOut;}};
}
test('admin loads complete products, orders and subscribers beyond response limits',async()=>{
 const rows=Array.from({length:1050},(_,i)=>({id:i+1,active:i%2===0}));const env=api({tables:{products:rows,orders:rows,newsletter_subscribers:rows}});
 for(const method of ['listProducts','listOrders','listSubscribers']){const result=await env.api[method]();assert.equal(result.length,1050);assert.equal(new Set(result.map(p=>p.id)).size,1050);assert.equal(result.at(-1).id,1050);}
 assert.equal((await env.api.listProducts(false)).length,525);assert.ok(env.requests.some(r=>r.start===1000));
});
test('admin pagination and accent-insensitive filters cover every source record once',()=>{
 const model=data(),rows=Array.from({length:1050},(_,i)=>({id:i+1,name:'Áo trắng',brand:'MLB',category:i%2?'Apparel':'Sneakers',active:i%3!==0}));
 const found=[];for(let page=1;page<=35;page++)found.push(...model.page(rows,page,30).items.map(p=>p.id));
 assert.equal(found.length,1050);assert.equal(new Set(found).size,1050);assert.equal(model.page(rows,99,30).page,35);
 const filtered=model.filterProducts(rows,{query:'ao trang',category:'Apparel',status:'active'});assert.ok(filtered.length>0);assert.ok(filtered.every(p=>p.category==='Apparel'&&p.active));assert.equal(model.page([],8).page,1);
});
test('editing variant labels preserves stable IDs, galleries and size metadata',()=>{
 const model=data(),original={id:'original-sku-01',label:'Trắng',image:'/one.webp',gallery:['/one.webp','/two.webp'],sizes:{M:{price:100000,stock:3}}};
 const result=model.variant(original,{label:'Trắng mới',image:original.image,gallery:original.gallery,stock:2,rows:[{size:'M',price:'150.000'}]});
 assert.equal(result.id,'original-sku-01');assert.equal(result.label,'Trắng mới');assert.equal(result.gallery.length,2);assert.equal(result.gallery[1],'/two.webp');assert.equal(result.sizes.M.price,150000);assert.equal(result.sizes.M.stock,3);assert.equal(original.sizes.M.price,100000);
 assert.throws(()=>model.variant({}, {label:'Đen',rows:[{size:'M',price:'10'},{size:'M',price:'20'}]}),/trùng/);
});
test('admin authentication denies missing sessions and users outside the admins table',async()=>{
 const noSession=api();assert.equal((await noSession.api.requireAdmin()).reason,'no-session');
 const unauthorized=api({session:{user:{id:'unlisted'}}});assert.equal((await unauthorized.api.requireAdmin()).reason,'not-admin');assert.equal(unauthorized.signedOut,true);
 const authorized=api({session:{user:{id:'allowed'}},admin:{user_id:'allowed'}});assert.equal((await authorized.api.requireAdmin()).ok,true);
});
test('a confirmed product save stays successful if the public catalog refresh fails',async()=>{
 const env=api({refreshFails:true});const result=await env.api.saveProduct({id:77,name:'Áo',slug:'ao',brand:'MLB',rating:0,reviews:0,variants:[],stock:0});assert.equal(result.id,77);assert.equal(result.name,'Áo');assert.equal(env.writes[0].rating,0);assert.equal(env.writes[0].stock,0);
});
test('CSV keeps Vietnamese, quotes and numbers while neutralizing formula-like text',()=>{
 const model=data();assert.equal(model.csvCell('Áo "trắng"'),'"Áo ""trắng"""');assert.equal(model.csvCell(150000),'"150000"');assert.equal(model.csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
});
