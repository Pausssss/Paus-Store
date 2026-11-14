/* Normalize and group storefront models while preserving every original SKU/size/price.
 * Admin keeps original records. Checkout maps each visible choice back to its source SKU.
 */
window.PAUS_CATALOG = (() => {
  const clean = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const reviewed = [
    {key:'mlb-liner-mid-denim-ny',name:'Liner Mid Denim NY',slugs:['mlb-liner-mid-denim-ny-den','mlb-liner-mid-denim-ny']},
    {key:'mlb-marty-12',name:'Marty Bag Size 12',match:p=>p.brand==='MLB'&&/^marty bag size 12(?: |$)/.test(clean(p.name))},
    {key:'mlb-tee-ny-39kw',name:'Tee NY 39kw',slugs:['mlb-tee-ny-39kw','mlb-tee-ny-trang-39kw']},
    {key:'mlb-tee-kid-ny',name:'Tee Kid NY',match:p=>p.brand==='MLB'&&/^tee kid ny(?: |$)/.test(clean(p.name))},
    {key:'whoau-calstate',name:'Tee Calstate',match:p=>p.brand==='WHO.A.U'&&/^tee calstate(?: |$)/.test(clean(p.name))},
    {key:'whoau-basic-25',name:'Nỉ Who Basic 25',match:p=>p.brand==='WHO.A.U'&&/^ni who basic 25(?: |$)/.test(clean(p.name))},
    {key:'mlb-bomber-ny-classic',name:'Bomber NY viền sọc',slugs:['mlb-bomber-ny-den','mlb-bomber-ny-xanh-la']},
    {key:'newera-ny-cardigan',name:'Cardigan NY New Era',slugs:['new-era-cdg-ny-new-era','new-era-cdg-ny-new-era-825']},
    {key:'rl-logo-tee',name:'Tee RL logo thêu',match:p=>p.brand==='Ralph Lauren'&&/^tee rl(?: |$)/.test(clean(p.name))},
    {key:'luggage-ribbed-24',name:'Vali ký gửi vân dọc 24 inch',slugs:['other-vali-ky-gui-24-inch','other-vali-ky-gui-24-inch-1033','other-vali-ky-gui-24-inch-1035','other-vali-ky-gui-24-inch-1037','other-vali-ky-gui-24-inch-1039','other-vali-ky-gui-24-inch-1041','other-vali-ky-gui-24-inch-1042','other-vali-ky-gui-24-inch-1043']},
    {key:'luggage-frame-22',name:'Vali khung 22 inch',slugs:['other-vali-xach-tay-22-inch-1036','other-vali-xach-tay-22-inch-1038']},
  ];
  const colorOverrides = {
    "nike-nike-v2k-run-pink-foam-wmns": "Pink Foam",
    "nike-nike-v2k-run-summit-white-metallic-silver": "Summit White / Metallic Silver",
    "nike-nike-v2k-run-pink": "Pink",
    "nike-nike-v2k-run-light-pumice-pink-foam": "Light Pumice / Pink Foam",
    "nike-nike-wmns-v2k-run-white-dark-obsidian": "White / Dark Obsidian",
    "jordan-jd-1-low-light-brown": "Light Brown",
    "jordan-jd-shadow-brown": "Shadow Brown",
    "asics-asics-white-green": "White / Green",
    "asics-asics-game-ff-white-green": "White / Green",
    "asics-asics-white-dark-neptune": "White / Dark Neptune",
    "new-era-cdg-ny-new-era": "Đen",
    "new-era-cdg-ny-new-era-825": "Nâu",

    'mlb-marty-bag-size-12-icer-grey':'Icer Grey', 'mlb-marty-bag-size-12-green':'Green',
    'jeep-jeep-light-beige-p651w13112':'Beige',
    'ralph-lauren-tee-rl-desrtrore':'Desert Rose', 'ralph-lauren-tee-rl-do-nhat':'Đỏ nhạt',
    'ralph-lauren-tee-rl-do-dam':'Đỏ đậm', 'ralph-lauren-tee-rl-cam-poppy':'Cam Poppy',
    'ralph-lauren-tee-rl-replen-pink':'Replen Pink',
    'other-vali-ky-gui-24-inch':'Trắng', 'other-vali-ky-gui-24-inch-1033':'Xám xanh',
    'other-vali-ky-gui-24-inch-1035':'Tím nhạt', 'other-vali-ky-gui-24-inch-1037':'Xanh navy',
    'other-vali-ky-gui-24-inch-1039':'Xanh nhạt', 'other-vali-ky-gui-24-inch-1041':'Đỏ cam',
    'other-vali-ky-gui-24-inch-1042':'Xanh mint', 'other-vali-ky-gui-24-inch-1043':'Xanh dương',
    'other-vali-xach-tay-22-inch-1036':'Bạc', 'other-vali-xach-tay-22-inch-1038':'Đen',
  };
  const titleOverrides = {
    'badblood-tee25-034':'TEE25 034 · chữ lớn',
    'badblood-tee25-034-908':'TEE25 034 · logo nhỏ',
  };
  const familyNames = {'Jordan|DC0774':'Jordan 1 Low','ASICS|1042A279':'ASICS Resolution · 1042A279','ASICS|1042A294':'ASICS GEL · 1042A294','ASICS|1041A489':'ASICS GAME FF · 1041A489','ASICS|1041A481':'ASICS GEL Resolution · 1041A481','ASICS|1041A370':'ASICS Court FF 3 · 1041A370','ASICS|1041A492':'ASICS · 1041A492','Nike|FZ2158':'Nike Vapor Pro 3 · FZ2158','Nike|FV5554':'Nike Vapor 12 · FV5554','Skechers|246109':'Skechers Viper Court Pro 2.0','Jeep|P651W13112':'Jeep Light · P651W13112','Puma|401287':'Puma Speedcat Ballet · 401287'};
  let state={products:[],aliases:new Map(),sourceChoices:new Map(),raw:[]};
  const historicalSlugs=new Map();
  function codeOf(p){
    const found=(p.features||[]).map(x=>String(x).replace(/^Mã:\s*/i,'').trim().toUpperCase());
    const embedded=String(p.name||'').match(/\b(?:[A-Z]{1,3}\d{4,}[A-Z0-9]*|\d{6})[-/]\d{2,3}\b|\bP\d{3}W\d{5}\b/gi)||[];
    return [...new Set([...found,...embedded])];
  }
  function family(p){
    for(const rule of reviewed)if(rule.slugs?.includes(p.slug)||rule.match?.(p))return{key:`reviewed:${rule.key}`,name:rule.name};
    if(p.brand==='Nike'&&/\bv2k\s*run\b/i.test(p.name)&&! /\b(?:kids?|gs|gore.?tex|gtx)\b/i.test(p.name))return{key:'Nike|V2K-RUN',name:'Nike V2K Run'};
    const codes=codeOf(p);
    if(['Nike','Jordan','ASICS','Skechers','Puma','Jeep'].includes(p.brand)){
      const bases=codes.map(c=>p.brand==='Jeep'&&/^P\d{3}W\d{5}$/.test(c)?c:c.match(/^([A-Z0-9]{5,})[-/]([A-Z0-9]{2,5})$/)?.[1]).filter(Boolean);
      if(bases.length&&new Set(bases).size===1){const key=`${p.brand}|${bases[0]}`;return{key,name:familyNames[key]||`${p.brand} · ${bases[0]}`};}
    }
    if(p.brand==='MLB'&&codes.length===1&&/^[37][A-Z]{3,}\d[A-Z0-9]+$/.test(codes[0]))return{key:`MLB|${codes[0]}`,name:p.name};
    return{key:`record:${p.id}`,name:titleOverrides[p.slug]||p.name};
  }
  function colorLabel(p,v,index,grouped){
    if(colorOverrides[p.slug]&&(p.variants||[]).length===1)return colorOverrides[p.slug];
    const label=String(v.label||'').trim();
    if(label&&label!=='Mặc định')return label;
    const code=codeOf(p)[index]||codeOf(p)[0];
    const match=p.name.match(/['‘]([^'’]+)['’]/);
    if(match)return match[1];
    return grouped?`Phiên bản ${code||p.id}`:(code?`Mã ${code}`:'Phiên bản tiêu chuẩn');
  }
  const price=raw=>Number(raw&&typeof raw==='object'?raw.price:raw);
  function build(raw){
    const groups=new Map(),aliases=new Map(),choices=new Map();
    for(const original of raw){
      if(original.active===false)continue;
      const p={...original};
      // Obvious brand misclassifications in the supplied file, identified by model name/SKU.
      if(p.brand==='Jeep'&&/adifom superstar/i.test(p.name))p.brand='adidas';
      if(p.brand==='Jeep'&&/^asic\s+court/i.test(p.name))p.brand='ASICS';
      const f=family(p),key=p.brand+'|'+p.category+'|'+f.key;
      if(!groups.has(key))groups.set(key,{family:f,records:[]});groups.get(key).records.push(p);
    }
    const products=[];
    for(const {family:f,records} of groups.values()){
      records.sort((a,b)=>Number(a.id)-Number(b.id));
      const first=records[0],merged=records.length>1;
      const product={...first,name:merged?f.name:(titleOverrides[first.slug]||first.name),variants:[],sourceIds:records.map(p=>p.id),sourceSlugs:records.map(p=>p.slug),sourceNames:records.map(p=>p.name),groupKey:f.key};
      const seenIds=new Set();
      for(const p of records){
        const rawVariants=p.variants?.length?p.variants:[{id:'default',label:'Mặc định',image:p.image,gallery:p.gallery,sizes:p.sizes,stock:p.stock}];
        rawVariants.forEach((v,index)=>{
          const label=colorLabel(p,v,index,merged),normalized=clean(label);
          const same=product.variants.find(x=>clean(x.colorLabel)===normalized&&Object.entries(v.sizes||{}).every(([size,value])=>x.sizes[size]==null||price(x.sizes[size])===price(value)));
          const source={id:Number(p.id),variant:String(v.id||'default')};
          if(same){
            for(const [size,value] of Object.entries(v.sizes||{})){if(same.sizes[size]==null){same.sizes[size]=value;same.sourceBySize[size]=source;}}
            same.gallery=[...new Set([...same.gallery,v.image,...v.gallery||[]])].filter(Boolean);
            same.stock=Math.max(Number(same.stock)||0,Number(v.stock)||0);same.sources.push(source);
            choices.set(`${p.id}|${source.variant}`,{id:product.id,variant:same.id});return;
          }
          let id=String(v.id||'default');if(seenIds.has(id))id=`${id}--${p.id}`;seenIds.add(id);
          const variant={...v,id,label,colorLabel:label,sizes:{...v.sizes},gallery:[...new Set([v.image,...v.gallery||[]])].filter(Boolean),sourceBySize:Object.fromEntries(Object.keys(v.sizes||{}).map(size=>[size,source])),sources:[source]};
          product.variants.push(variant);choices.set(`${p.id}|${source.variant}`,{id:product.id,variant:id});
        });
      }
      // A repeated color with a different price remains an explicit option, never overwritten.
      const duplicateColors=new Set(product.variants.filter((v,i,a)=>a.some((x,j)=>j!==i&&clean(x.colorLabel)===clean(v.colorLabel))).map(v=>clean(v.colorLabel)));
      product.variants.forEach(v=>{if(duplicateColors.has(clean(v.colorLabel))){
        const values=Object.values(v.sizes).map(price).filter(p=>p>0),lo=Math.min(...values),hi=Math.max(...values);
        v.label=`${v.colorLabel} · ${lo.toLocaleString("vi-VN")}${hi>lo?"–"+hi.toLocaleString("vi-VN"):""} ₫`;
      }});
      product.hasPriceVariants=duplicateColors.size>0;
      product.colorCount=new Set(product.variants.map(v=>clean(v.colorLabel))).size;
      if(merged){product.short=`${product.colorCount} màu / phiên bản · chọn màu để xem size và giá.`;product.description=`${product.brand} ${product.name}. Các màu / phiên bản được gom trong cùng một mẫu; mỗi lựa chọn giữ ảnh, size và giá riêng.`;product.features=[...new Set(records.flatMap(p=>p.features||[]))];}
      product.featured=records.some(p=>p.featured);product.stock=product.variants.reduce((sum,v)=>sum+(Number(v.stock)||0),0);product.active=records.some(p=>p.active!==false);product.sort_order=Math.min(...records.map(p=>Number(p.sort_order)||0));
      product.image=product.variants[0]?.image||first.image;product.sizes=product.variants[0]?.sizes||{};product.gallery=product.variants[0]?.gallery||[];
      products.push(product);records.forEach(p=>{aliases.set(String(p.id),product);aliases.set(p.slug,product);});
    }
    return{products,aliases,sourceChoices:choices,raw};
  }
  function apply(raw,target){
    for(const p of raw) { if(p.slug)historicalSlugs.set(p.slug,String(p.id)); }
    state=build(raw);
    for(const [slug,id] of historicalSlugs){const current=state.aliases.get(id);if(current&&!state.aliases.has(slug))state.aliases.set(slug,current);}
    target.splice(0,target.length,...state.products);return state.products;
  }
  function resolve(id){return state.aliases.get(String(id))||null;}
  function resolveChoice(id,variant){return state.sourceChoices.get(`${id}|${variant}`)||null;}
  function sourceItem(line){const p=resolve(line.id),v=p?.variants.find(v=>v.id===line.variant),source=v?.sourceBySize[line.size];return source?{id:source.id,variant:source.variant,size:line.size,qty:Number(line.qty)}:{id:Number(line.id),variant:line.variant||'default',size:line.size,qty:Number(line.qty)};}
  return{apply,build,resolve,resolveChoice,sourceItem,getRaw:()=>state.raw,getStats:()=>({sourceRecords:state.raw.length,models:state.products.length,mergedModels:state.products.filter(p=>p.sourceIds.length>1).length})};
})();
if(typeof PRODUCTS!=='undefined'&&!document.body?.dataset?.admin)window.PAUS_CATALOG.apply([...PRODUCTS],PRODUCTS);
