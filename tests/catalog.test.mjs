import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function setup(admin=false){const memory=new Map();const toast={classList:{add(){},remove(){}}};const c={console,Intl,URLSearchParams,Date,Math,JSON,setTimeout(){return 1},clearTimeout(){},document:{body:{dataset:admin?{admin:'true'}:{}},addEventListener(){},querySelectorAll:()=>[],getElementById:id=>id==='toast'?toast:null},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},location:{hostname:'example.test'},navigator:{}};c.window=c;vm.createContext(c);vm.runInContext(read('assets/data/config.js')+read('assets/data/brands.js')+read('assets/data/products.js')+read('assets/js/core/catalog.js')+read('assets/js/core/store.js')+';this.api=PAUS;this.items=PRODUCTS;',c);return{c,api:c.api,catalog:c.PAUS_CATALOG,memory};}
test('all 2,121 source size prices survive grouping and aliases lead to the correct choices',()=>{
 const {catalog}=setup(),raw=catalog.getRaw();assert.equal(raw.length,1050);assert.equal(catalog.getStats().models,1003);assert.equal(catalog.getStats().mergedModels,25);
 let count=0;for(const p of raw)for(const v of p.variants)for(const [size,value] of Object.entries(v.sizes)){
  const mapped=catalog.resolveChoice(p.id,v.id),model=catalog.resolve(p.id),variant=model.variants.find(v=>v.id===mapped.variant);assert.equal(Number(variant.sizes[size]),Number(value),`${p.id}/${v.id}/${size}`);assert.equal(catalog.resolve(p.slug).id,model.id);assert.ok(variant.sources.some(source=>source.id===p.id&&source.variant===v.id));count++;
 }assert.equal(count,2121);
});
test('same generic name or conflicting artwork never merges different products',()=>{
 const {catalog}=setup();for(const [a,b]of [[230,246],[258,354],[375,401],[733,735],[901,908],[1031,1044],[1032,1034]])assert.notEqual(catalog.resolve(a).id,catalog.resolve(b).id,`${a} and ${b}`);
 assert.notEqual(catalog.resolve(99).id,catalog.resolve(122).id);assert.equal(catalog.resolve(64).id,catalog.resolve(70).id);assert.equal(catalog.resolve(733).id,catalog.resolve(734).id);
});
test('conflicting prices within one color remain independent choices',()=>{
 const{catalog}=setup();const a=catalog.resolveChoice(224,'trang'),b=catalog.resolveChoice(232,'trang');assert.equal(a.id,b.id);assert.notEqual(a.variant,b.variant);
 const p=catalog.resolve(224);assert.equal(p.hasPriceVariants,true);assert.equal(p.variants.find(v=>v.id===a.variant).sizes.L,620000);assert.equal(p.variants.find(v=>v.id===b.variant).sizes.L,550000);
});
test('existing cart, wishlist and product URLs survive merged model ids',()=>{
 const{catalog,api,memory}=setup();const source=catalog.getRaw().find(p=>p.id===70),v=source.variants[0],size=Object.keys(v.sizes)[0];
 memory.set('paus_fashion_cart_v6',JSON.stringify([{id:70,variant:v.id,size,qty:1}]));memory.set('paus_fashion_wishlist_v6',JSON.stringify([64,70,75]));
 const line=api.cart()[0];assert.equal(line.id,64);assert.equal(api.product(70).id,64);assert.equal(api.wishlist().length,1);assert.equal(api.cartSubtotal(),v.sizes[size]);assert.equal(api.cart()[0].variant,line.variant);
 const payload=catalog.sourceItem(line);assert.equal(payload.id,70);assert.equal(payload.variant,v.id);assert.equal(payload.size,size);
});
test('future color records group automatically, while admin retains raw records',()=>{
 const{catalog}=setup();const raw=catalog.getRaw();const extra={...raw.find(p=>p.id===64),id:8000,slug:'nike-v2k-run-test-color',name:"Nike V2K Run 'Test Color'",variants:[{id:'new-color',label:'Test Color',image:'assets/images/product-fallback.svg',gallery:[],sizes:{'240':1234567},stock:1}]};const result=catalog.build([...raw,extra]);assert.equal(result.aliases.get('8000').id,result.aliases.get('64').id);assert.equal(result.aliases.get('8000').variants.find(v=>v.id==='new-color').sizes['240'],1234567);
 const original=raw.find(p=>p.id===2);const target=[];catalog.apply(raw.map(p=>p.id===2?{...p,slug:"renamed-live-model"}:p),target);assert.equal(catalog.resolve(original.slug).id,catalog.resolve("renamed-live-model").id);
 const admin=setup(true);assert.equal(admin.c.items.length,1050);assert.equal(admin.catalog.getStats().models,0);
});
test('20 brand marks are local original assets with recorded official sources and matching hashes',()=>{
 const sources=JSON.parse(read('docs/BRAND-SOURCES.json'));assert.equal(sources.length,20);for(const source of sources){assert.match(source.page,/^https:\/\//);const path=new URL('../'+source.file,import.meta.url);assert.ok(existsSync(path));assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),source.sha256);if(source.file.endsWith('.svg'))assert.doesNotMatch(readFileSync(path,'utf8'),/<script\b|<foreignObject\b/i);}
 const {api}=setup();const mark=api.brandMark('Nike');assert.match(mark,/assets\/images\/brands\/nike.svg/);assert.doesNotMatch(mark,/cdn.simpleicons|google.com/);assert.equal(api.brandMark('Other'),'');
});
