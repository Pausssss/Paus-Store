PAUS_BOOT(() => {
  const params = new URLSearchParams(location.search);
  const grid = document.getElementById("shopGrid"), count = document.getElementById("resultCount");
  const active = document.getElementById("activeFilters"), minInput = document.getElementById("minPrice"), maxInput = document.getElementById("maxPrice");
  const sortSelect = document.getElementById("sortSelect"), search = document.getElementById("shopQuery"), pagination = document.getElementById("shopPagination");
  const pageSize = 24;
  let catalog = PRODUCTS.filter(p => p.active !== false);
  const positive = value => value !== null && value !== "" && Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : null;
  const normalize = text => String(text).toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
  const initial = () => ({cats:[],cols:[],brands:[],min:null,max:null,q:"",sort:"featured",page:1});
  let state = {...initial(),cats:params.getAll("category"),cols:params.getAll("collection"),brands:params.getAll("brand"),min:positive(params.get("min")),max:positive(params.get("max")),q:params.get("q")||"",sort:params.get("sort")||"featured",page:Math.max(1,parseInt(params.get("page"),10)||1)};
  const labels = {"Sneakers":"Giày & sneaker","Slides & Sandals":"Dép & sandals","Apparel":"Thời trang","Bags & Accessories":"Túi & phụ kiện"};
  const unique = key => [...new Set(catalog.map(p => p[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  function options(id,name,values) { document.getElementById(id).innerHTML = values.map(v => `<label class="check"><input type="checkbox" name="${name}" value="${PAUS.esc(v)}"> ${name==="brand"?PAUS.brandMark(v):""} ${PAUS.esc(labels[v]||v)}</label>`).join(""); }
  options("categoryFilters","cat",unique("category"));options("collectionFilters","col",unique("collection"));options("brandFilters","brand",unique("brand"));
  if (![...sortSelect.options].some(o=>o.value===state.sort)) state.sort="featured";
  function sync() {
    for (const [name,key] of [["cat","cats"],["col","cols"],["brand","brands"]]) document.querySelectorAll(`[name="${name}"]`).forEach(input=>{input.checked=state[key].includes(input.value);});
    minInput.value=state.min??"";maxInput.value=state.max??"";sortSelect.value=state.sort;search.value=state.q;
  }
  function updateUrl() {
    const next=new URLSearchParams();for(const [key,values] of [["category",state.cats],["collection",state.cols],["brand",state.brands]]) values.forEach(v=>next.append(key,v));
    if(state.q)next.set("q",state.q);if(state.min!==null)next.set("min",state.min);if(state.max!==null)next.set("max",state.max);if(state.sort!=="featured")next.set("sort",state.sort);if(state.page>1)next.set("page",state.page);
    history.replaceState(null,"",`shop.html${next.size?`?${next}`:""}`);
  }
  function render() {
    const query=normalize(state.q.trim());
    let products=catalog.filter(p=>(!state.cats.length||state.cats.includes(p.category))&&(!state.cols.length||state.cols.includes(p.collection))&&(!state.brands.length||state.brands.includes(p.brand))&&(!query||normalize([p.brand,p.name,p.category,p.collection,...p.features||[],...p.sourceNames||[],...p.variants.map(v=>v.label)].join(" ")).includes(query)));
    products=products.filter(p=>{const price=PAUS.minPrice(p);return(state.min===null||price>=state.min)&&(state.max===null||price<=state.max);});
    products.sort(state.sort==="priceAsc"?(a,b)=>PAUS.minPrice(a)-PAUS.minPrice(b):state.sort==="priceDesc"?(a,b)=>PAUS.minPrice(b)-PAUS.minPrice(a):state.sort==="name"?(a,b)=>a.name.localeCompare(b.name,"vi"):(a,b)=>Number(b.featured)-Number(a.featured)||Number(a.sort_order||0)-Number(b.sort_order||0));
    const pages=Math.max(1,Math.ceil(products.length/pageSize));state.page=Math.min(state.page,pages);
    const start=(state.page-1)*pageSize;count.textContent=`${products.length.toLocaleString("vi-VN")} sản phẩm`;
    grid.innerHTML=products.length?products.slice(start,start+pageSize).map(PAUS.card).join(""):`<div class="empty"><div class="empty-icon" aria-hidden="true">⌕</div><h2>Chưa tìm thấy món phù hợp.</h2><p>Thử một từ khóa khác hoặc xóa bớt bộ lọc.</p><button class="btn dark" type="button" data-reset>Xóa bộ lọc ↗</button></div>`;
    grid.setAttribute("aria-busy","false");
    const pills=[];for(const [type,values] of [["cat",state.cats],["col",state.cols],["brand",state.brands]]) values.forEach(v=>pills.push(`<button class="filter-pill" type="button" data-pill="${type}" data-value="${PAUS.esc(v)}" aria-label="Bỏ lọc ${PAUS.esc(v)}">${PAUS.esc(labels[v]||v)} ×</button>`));
    if(state.q)pills.push(`<button class="filter-pill" type="button" data-pill="q" aria-label="Bỏ từ khóa">“${PAUS.esc(state.q)}” ×</button>`);
    if(state.min!==null||state.max!==null)pills.push(`<button class="filter-pill" type="button" data-pill="price">${state.min!==null?PAUS.money(state.min):"0 ₫"} – ${state.max!==null?PAUS.money(state.max):"không giới hạn"} ×</button>`);
    active.innerHTML=pills.join("");
    let buttons="";
    if(products.length>pageSize){
      const nums=[...new Set([1,state.page-1,state.page,state.page+1,pages])].filter(n=>n>0&&n<=pages).sort((a,b)=>a-b);
      buttons=`<button type="button" data-page="prev" ${state.page===1?"disabled":""} aria-label="Trang trước">← Trước</button>`;
      nums.forEach((n,i)=>{if(i&&n-nums[i-1]>1)buttons+='<span aria-hidden="true">…</span>';buttons+=`<button type="button" data-page="${n}" ${n===state.page?'aria-current="page"':""} aria-label="Trang ${n}">${n}</button>`;});
      buttons+=`<button type="button" data-page="next" ${state.page===pages?"disabled":""} aria-label="Trang sau">Sau →</button>`;
    }
    pagination.innerHTML=buttons;document.getElementById("pageInfo").textContent=products.length?`Đang xem ${start+1}–${Math.min(start+pageSize,products.length)} / ${products.length} sản phẩm`:"";
    updateUrl();
  }
  function reset(){state=initial();sync();render();}
  document.querySelectorAll('[name="cat"],[name="col"],[name="brand"]').forEach(input=>input.addEventListener("change",()=>{
    state.cats=[...document.querySelectorAll('[name="cat"]:checked')].map(i=>i.value);state.cols=[...document.querySelectorAll('[name="col"]:checked')].map(i=>i.value);state.brands=[...document.querySelectorAll('[name="brand"]:checked')].map(i=>i.value);state.page=1;render();
  }));
  for(const [input,key] of [[minInput,"min"],[maxInput,"max"]])input.addEventListener("change",()=>{state[key]=positive(input.value);state.page=1;render();});
  sortSelect.addEventListener("change",()=>{state.sort=sortSelect.value;state.page=1;render();});
  document.getElementById("shopSearch").addEventListener("submit",event=>{event.preventDefault();state.q=search.value.trim();state.page=1;render();});
  search.addEventListener("search",()=>{state.q=search.value.trim();state.page=1;render();});
  document.getElementById("resetFilters").addEventListener("click",reset);grid.addEventListener("click",e=>{if(e.target.closest("[data-reset]"))reset();});
  active.addEventListener("click",event=>{const b=event.target.closest("[data-pill]");if(!b)return;const key={cat:"cats",col:"cols",brand:"brands"}[b.dataset.pill];if(key)state[key]=state[key].filter(v=>v!==b.dataset.value);if(b.dataset.pill==="q")state.q="";if(b.dataset.pill==="price"){state.min=null;state.max=null;}state.page=1;sync();render();});
  pagination.addEventListener("click",event=>{const b=event.target.closest("[data-page]");if(!b||b.disabled)return;state.page=b.dataset.page==="next"?state.page+1:b.dataset.page==="prev"?state.page-1:Number(b.dataset.page);render();document.querySelector(".shop-top").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});const current=pagination.querySelector('[aria-current="page"]');current?.focus({preventScroll:true});});
  document.getElementById("mobileFilter").addEventListener("click",e=>{const open=document.getElementById("filters").classList.toggle("mobile-open");e.currentTarget.setAttribute("aria-expanded",String(open));e.currentTarget.textContent=open?"Đóng bộ lọc":"Bộ lọc";if(open)e.currentTarget.textContent="Đóng bộ lọc";});
  sync();render();
  document.addEventListener("paus:catalog-ready",()=>{catalog=PRODUCTS.filter(p=>p.active!==false);render();});
}, {waitForData:false});
