import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function worker(){
 const handlers=new Map();let fetches=0;
 const cached={cached:true},cache={match:async request=>String(request.url||request).includes('/assets/')?cached:null,put:async()=>{}};
 const context={URL,Response,Promise,fetch:async()=>{fetches++;return{ok:true,clone(){return this;}};},caches:{open:async()=>cache},self:{location:{origin:'https://store.test'},addEventListener:(name,fn)=>handlers.set(name,fn)}};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../service-worker.js',import.meta.url),'utf8'),context);
 return{handlers,cached,get fetches(){return fetches;}};
}
test('cached public assets return without waiting on or repeating the network',async()=>{
 const env=worker();let response;
 env.handlers.get('fetch')({request:{url:'https://store.test/assets/images/shoe.webp',method:'GET'},respondWith:value=>response=value,waitUntil(){}});
 assert.equal(await response,env.cached);assert.equal(env.fetches,0);
});
test('worker never intercepts Auth, admin, Supabase or write requests',()=>{
 const env=worker();let intercepted=0;
 for(const [url,method] of [['https://store.test/admin/index.html','GET'],['https://store.test/assets/js/admin/admin.js?v=1','GET'],['https://store.test/assets/data/supabase-config.js?v=1','GET'],['https://project.supabase.co/rest/v1/orders','GET'],['https://store.test/orders','POST']])env.handlers.get('fetch')({request:{url,method},respondWith(){intercepted++;},waitUntil(){}});
 assert.equal(intercepted,0);assert.equal(env.fetches,0);
});
