import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function backend(config={},client=null,{dataset={},sessionStorage}={}){
  const c={console:{warn(){},error(){}},location:{hostname:'example.test'},localStorage:{getItem(){return null;}},document:{body:{dataset},addEventListener(){}},sessionStorage,URL,URLSearchParams,Promise,setTimeout,clearTimeout};c.window=c;c.PAUS_SUPABASE=config;
  if(client)c.PAUS_PUBLIC_CLIENT={createClient:()=>client};vm.createContext(c);vm.runInContext(read('assets/data/config.js')+read('assets/data/products.js')+read('assets/js/core/catalog.js')+read('assets/js/core/backend.js'),c);return c;
}
test('newsletter cannot report success without a receiving backend',async()=>{
  const c=backend();await c.PAUS_DATA_READY;await assert.rejects(c.PAUS_BACKEND.subscribeNewsletter('qa@example.test'),/chưa kết nối/);await assert.rejects(c.PAUS_BACKEND.subscribeNewsletter('bad email'),/hợp lệ/);
});
test('demo coupons are not accepted on hosted storefronts without server verification',async()=>{
  const c=backend();await c.PAUS_DATA_READY;await assert.rejects(c.PAUS_BACKEND.validateCoupon('DEMO10'),/xác minh/);
});
function query(data,error=null){const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,maybeSingle:()=>q,then:(resolve,reject)=>Promise.resolve({data,error}).then(resolve,reject)};return q;}
test('catalog failure keeps admin client but orders switch to explicit draft mode',async()=>{
  const client={from:()=>query(null,new Error('offline')),rpc:async()=>({error:new Error('offline')})};const c=backend({enabled:true,url:'https://example.test',anonKey:'test'},client);await c.PAUS_DATA_READY;assert.equal(c.PAUS_BACKEND.getMode(),'fallback');assert.equal(c.PAUS_BACKEND.getClient(),client);
});
test('catalog reading continues beyond the 1,000-row REST page limit',async()=>{
  const offsets=[];let current=0;
  const client={from(table){const q={select:()=>q,eq:()=>q,order:()=>q,range(start){current=start;offsets.push(start);return q;},maybeSingle:()=>q,then(resolve,reject){const data=table==='store_settings'?null:Array.from({length:current===0?1000:50},(_,i)=>({id:current+i+1,features:[],name:'Product',active:true}));return Promise.resolve({data,error:null}).then(resolve,reject);}};return q;}};
  const c=backend({enabled:true,url:'https://example.test',anonKey:'test'},client);await c.PAUS_DATA_READY;assert.deepEqual(offsets,[0,1000]);assert.equal(vm.runInContext('PRODUCTS.length',c),1050);assert.equal(c.PAUS_BACKEND.getMode(),'supabase');
});
test('public REST requests use expected filters and require a successful response',async()=>{
  let requested;
  const c={URLSearchParams,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{requested={url,options};return{ok:true,json:async()=>[{data:{standardShipping:35000}}]};}};c.window=c;vm.createContext(c);vm.runInContext(read('assets/js/core/public-client.js'),c);
  const api=c.PAUS_PUBLIC_CLIENT.createClient('https://example.test','public-test-key');const result=await api.from('store_settings').select('data').eq('id',1).maybeSingle();assert.equal(result.data.data.standardShipping,35000);assert.match(requested.url,/id=eq.1/);assert.equal(requested.options.credentials,'omit');
  c.fetch=async()=>({ok:false,status:503,json:async()=>({})});const failure=await api.rpc('subscribe_newsletter',{p_email:'qa@example.test'});assert.ok(failure.error);assert.equal(failure.data,null);
});

function delayedQuery(promise){const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,maybeSingle:()=>q,then:(resolve,reject)=>promise.then(data=>({data,error:null})).then(resolve,reject)};return q;}
const testConfig={enabled:true,url:'https://example.test',anonKey:'test'};
const memory=entries=>{const values=new Map(entries);return{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
test('admin startup creates the Auth client without reading a public catalog',async()=>{
 let reads=0;const client={from(){reads++;throw new Error('Admin must not read public data before authentication');}};
 const c=backend(testConfig,client,{dataset:{admin:'true'}});await c.PAUS_DATA_READY;assert.equal(reads,0);assert.equal(c.PAUS_BACKEND.getClient(),client);assert.equal(c.PAUS_BACKEND.getMode(),'supabase');
});
test('a fresh project-specific public cache renders without a repeat catalog download',async()=>{
 let reads=0;const client={from(){reads++;throw new Error('Fresh public cache should be reused');}};
 const storage=memory([['paus_public_catalog_v1',JSON.stringify({origin:testConfig.url,savedAt:Date.now(),rows:[{id:7001,slug:'cached',brand:'Nike',name:'Cached',features:[],active:true,variants:[],sizes:{M:100000}}]})]]);
 const c=backend(testConfig,client,{sessionStorage:storage});await c.PAUS_DATA_READY;
 assert.equal(vm.runInContext('PRODUCTS[0].id',c),7001);assert.equal(c.PAUS_BACKEND.getMode(),'supabase');assert.equal(reads,0);
});
test('expired or another-project caches cannot enable a successful live mode',async()=>{
 for(const entry of [{origin:testConfig.url,savedAt:Date.now()-121000},{origin:'https://another.test',savedAt:Date.now()}]){
  const storage=memory([['paus_public_catalog_v1',JSON.stringify({...entry,rows:[{id:7001,name:'Wrong cache'}]})]]);
  const c=backend(testConfig,{from:()=>query(null,new Error('offline'))},{sessionStorage:storage});await c.PAUS_DATA_READY;assert.equal(c.PAUS_BACKEND.getMode(),'fallback');assert.notEqual(vm.runInContext('PRODUCTS[0].id',c),7001);
 }
});
test('informational pages initialize without downloading or waiting for the catalog',async()=>{
 const reads=[];let release;const gate=new Promise(resolve=>release=resolve);
 const c=backend(testConfig,{from:table=>{reads.push(table);return delayedQuery(gate);}},{dataset:{catalog:'skip'}});await c.PAUS_DATA_READY;assert.deepEqual(reads,['store_settings']);release(null);await c.PAUS_BACKEND.whenRefreshed();
});
test('visual boot callbacks can run while a catalog-dependent callback waits',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 const c=backend(testConfig,{from:table=>delayedQuery(table==='products'?gate:Promise.resolve(null))});
 const callbacks=[];c.document.addEventListener=(name,fn)=>{if(name==='DOMContentLoaded')callbacks.push(fn);};
 let visual=false,data=false;c.PAUS_BOOT(()=>visual=true,{waitForData:false});c.PAUS_BOOT(()=>data=true);
 const runs=callbacks.map(fn=>fn());await Promise.resolve();assert.equal(visual,true);assert.equal(data,false);
 release([]);await Promise.all(runs);assert.equal(data,true);
});

test('on-demand catalog reads from informational pages share one in-flight request',async()=>{
 const reads=[];let release;const gate=new Promise(resolve=>release=resolve);
 const c=backend(testConfig,{from:table=>{reads.push(table);return delayedQuery(table==='products'?gate:Promise.resolve(null));}},{dataset:{catalog:'skip'}});
 await c.PAUS_DATA_READY;const first=c.PAUS_BACKEND.ensureCatalog(),second=c.PAUS_BACKEND.ensureCatalog();assert.equal(first,second);assert.equal(reads.filter(t=>t==='products').length,1);release([]);await first;assert.equal(c.PAUS_BACKEND.getMode(),'supabase');
});
