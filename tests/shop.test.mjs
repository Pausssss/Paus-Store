/* Data/state tests with a minimal DOM adapter; these are not browser layout tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function loadShop(search=''){
 const nodes=new Map(),inputs=[],memory=new Map();let url='';
 class Element{
  constructor(id=''){this.id=id;this.value='';this.textContent='';this.checked=false;this.events={};this.attributes={};this._html='';this.classes=new Set();this.classList={toggle:(key)=>{if(this.classes.has(key)){this.classes.delete(key);return false;}this.classes.add(key);return true;},add:()=>{},remove:()=>{}};}
  set innerHTML(text){this._html=text;if(this.id.endsWith('Filters')){for(const m of text.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]+)"/g)){const input=new Element();input.name=m[1];input.value=m[2].replace(/&amp;/g,'&');inputs.push(input);}}}
  get innerHTML(){return this._html;}setAttribute(k,v){this.attributes[k]=v;}addEventListener(k,fn){this.events[k]=fn;}querySelector(){return new Element();}focus(){}scrollIntoView(){}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
 const all=selector=>{if(selector.includes('[name=')){const patterns=[...selector.matchAll(/\[name="([^"]+)"\](:checked)?/g)];return inputs.filter(input=>patterns.some(m=>input.name===m[1]&&(!m[2]||input.checked)));}return[];};
 get('sortSelect').options=['featured','priceAsc','priceDesc','name'].map(value=>({value}));
 const c={console,URLSearchParams,Intl,Date,Math,JSON,encodeURIComponent,setTimeout(){return 1;},clearTimeout(){},matchMedia:()=>({matches:true}),location:{search,hostname:'localhost'},history:{replaceState(_a,_b,value){url=value;}},navigator:{},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{body:{dataset:{}},getElementById:get,querySelector:()=>new Element(),querySelectorAll:all,addEventListener(){}},PAUS_BOOT(fn){fn();}};c.window=c;vm.createContext(c);vm.runInContext(read('assets/data/config.js')+read('assets/data/products.js')+read('assets/js/core/catalog.js')+read('assets/js/core/store.js')+read('assets/js/pages/shop.js')+';this.api=PAUS;this.items=PRODUCTS;',c);
 return{get,c,url:()=>url,ids:()=>[...get('shopGrid').innerHTML.matchAll(/data-wish="(\d+)"/g)].map(m=>Number(m[1])),clickPage(page){get('shopPagination').events.click({target:{closest:()=>({dataset:{page},disabled:false})}});}};
}
test('shop paginates the catalog into distinct groups of 24 products',()=>{
 const ui=loadShop();const first=ui.ids();assert.equal(first.length,24);assert.match(ui.get('resultCount').textContent,/1[.,]003/);ui.clickPage('next');assert.equal(ui.ids().length,24);assert.ok(ui.ids().every(id=>!first.includes(id)));assert.match(ui.url(),/page=2/);ui.clickPage('prev');assert.deepEqual(ui.ids(),first);
});
test('brand, category and price constraints combine and remain in the URL',()=>{
 const ui=loadShop('?brand=Nike&category=Sneakers');assert.ok(ui.ids().every(id=>{const p=ui.c.api.product(id);return p.brand==='Nike'&&p.category==='Sneakers';}));
 ui.get('minPrice').value='1500000';ui.get('minPrice').events.change();assert.ok(ui.ids().every(id=>ui.c.api.minPrice(ui.c.api.product(id))>=1500000));assert.match(ui.url(),/min=1500000/);
 ui.get('maxPrice').value='1';ui.get('maxPrice').events.change();assert.equal(ui.ids().length,0);assert.match(ui.get('shopGrid').innerHTML,/Chưa tìm thấy/);ui.get('resetFilters').events.click();assert.equal(ui.ids().length,24);assert.equal(ui.url(),'shop.html');
});
test('price sorting and searches execute against actual catalog data',()=>{
 const ui=loadShop();ui.get('sortSelect').value='priceAsc';ui.get('sortSelect').events.change();const prices=ui.ids().map(id=>ui.c.api.minPrice(ui.c.api.product(id)));assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
 ui.get('shopQuery').value='v2k';ui.get('shopSearch').events.submit({preventDefault(){}});assert.ok(ui.ids().length>0);assert.ok(ui.ids().every(id=>/v2k/i.test(ui.c.api.product(id).name)));assert.match(ui.url(),/q=v2k/);
});
