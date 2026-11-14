/* Pure admin data transforms, kept separate from DOM and Supabase. */
window.PAUS_ADMIN_DATA = (() => {
  const normalize=value=>String(value??'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  function page(items,requested=1,size=30){
    size=Math.max(1,Math.floor(Number(size)||30));
    const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.max(1,Math.min(pages,Math.floor(Number(requested)||1)));
    const start=(current-1)*size;
    return{items:items.slice(start,start+size),page:current,pages,total:items.length,start:items.length?start+1:0,end:Math.min(start+size,items.length)};
  }
  function filterProducts(products,{query='',status='all',category='all'}={}){
    const q=normalize(query.trim());
    return products.filter(p=>(!q||normalize([p.id,p.name,p.brand,p.slug,p.category,p.collection,...p.features||[]].join(' ')).includes(q))&&(category==='all'||p.category===category)&&(status==='all'||(status==='active'?p.active!==false:p.active===false)));
  }
  function variant(original,edited){
    const label=String(edited.label||'Mặc định').trim(),image=String(edited.image||'').trim(),sizes={};
    for(const row of edited.rows){
      const size=String(row.size||'').trim(),price=Number(String(row.price||'').replace(/[^0-9]/g,''));
      if(!size||!price)throw new Error('Mỗi size cần tên và giá bán lớn hơn 0.');
      if(Object.hasOwn(sizes,size))throw new Error(`Size ${size} bị trùng trong cùng màu.`);
      const previous=original.sizes?.[size];
      sizes[size]=previous&&typeof previous==='object'?{...previous,price}:price;
    }
    const id=original.id||normalize(label).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'default';
    return{...original,id,label,image,gallery:[...new Set([image,...edited.gallery||[]].map(v=>String(v).trim()).filter(Boolean))],sizes,stock:Math.max(0,Math.floor(Number(edited.stock)||0))};
  }
  function csvCell(value){
    let text=String(value??'');
    if(typeof value!=='number'&&/^[=+\-@\t\r]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  return{normalize,page,filterProducts,variant,csvCell};
})();
