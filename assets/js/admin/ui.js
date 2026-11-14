/* Shared admin feedback, labels, mobile navigation and dialog focus. */
window.PAUS_ADMIN_UI = (() => {
  let fieldIndex=0,activeDialog=null,returnFocus=null,sidebarReturn=null;
  const shell=document.querySelector('.admin-shell'),sidebar=document.getElementById('sidebar');
  const menu=document.getElementById('menuAdmin'),scrim=document.getElementById('adminScrim');
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focusable=root=>[...root.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>!el.hidden&&el.getClientRects().length&&!el.closest('[inert]'));
  function error(message){
    const modal=document.querySelector('.modal-backdrop.open');
    let box=modal?.querySelector('[data-form-feedback]')||document.getElementById('adminGlobalMessage')||document.getElementById('loginError');
    if(!box&&modal){box=document.createElement('p');box.dataset.formFeedback='';box.setAttribute('role','alert');modal.querySelector('.modal-body').prepend(box);}
    if(!box)return;
    box.hidden=false;box.className='admin-feedback error';box.textContent=String(message?.message||message||'Thao tác chưa hoàn tất. Vui lòng thử lại.');
    box.scrollIntoView({block:'nearest',behavior:reduced()?'instant':'smooth'});
  }
  function sidebarOpen(open){
    if(!sidebar||!menu)return;
    open=Boolean(open&&innerWidth<=1000);
    if(open&&!sidebar.classList.contains('open'))sidebarReturn=document.activeElement;
    sidebar.classList.toggle('open',open);sidebar.inert=innerWidth<=1000&&!open;
    menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Đóng điều hướng':'Mở điều hướng');
    if(scrim)scrim.hidden=!open;
    document.querySelector('.admin-main').inert=open;
    document.body.classList.toggle('admin-locked',open||Boolean(activeDialog));
    if(open)requestAnimationFrame(()=>focusable(sidebar)[0]?.focus());
    else if(sidebarReturn?.isConnected){sidebarReturn.focus({preventScroll:true});sidebarReturn=null;}
  }
  function labels(root=document){
    root.querySelectorAll('.field').forEach(field=>{
      const label=field.querySelector('label'),input=field.querySelector('input:not([type=checkbox]),textarea:not([hidden]),select');
      if(!label||!input||label.contains(input))return;
      if(!input.id)input.id=`admin-field-${++fieldIndex}`;
      label.htmlFor=input.id;
    });
  }
  function dialogState(){
    const next=document.querySelector('.modal-backdrop.open .admin-modal');
    if(next===activeDialog)return;
    const previous=activeDialog;
    if(next){
      if(!previous)returnFocus=document.activeElement;
      activeDialog=next;if(shell)shell.inert=true;
      document.body.classList.add('admin-locked');
      next.querySelectorAll('[data-form-feedback]').forEach(box=>box.hidden=true);
      requestAnimationFrame(()=>{if(activeDialog===next)(focusable(next)[0]||next).focus({preventScroll:true});});
    }else{
      activeDialog=null;if(shell)shell.inert=false;
      document.body.classList.remove('admin-locked');
      if(previous&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
      returnFocus=null;
    }
  }
  function validateVariants(builder){
    const cards=[...builder.querySelectorAll('.variant-card')];
    for(const card of cards){
      const seen=new Set();
      for(const row of card.querySelectorAll('.variant-size-row')){
        const name=row.querySelector('[data-size-name]'),price=row.querySelector('[data-size-price]');
        const size=name.value.trim(),value=Number(price.value.replace(/[^0-9]/g,''));
        name.setCustomValidity(!size?'Nhập size cho lựa chọn này.':seen.has(size)?'Size này đã có trong cùng màu.':'');
        price.setCustomValidity(!value?'Giá bán phải lớn hơn 0.':'');
        if(!name.reportValidity()||!price.reportValidity())return false;
        seen.add(size);
      }
    }
    return cards.length>0;
  }
  document.getElementById('togglePassword')?.addEventListener('click',event=>{
    const input=document.getElementById('password'),visible=input.type==='password';
    input.type=visible?'text':'password';event.currentTarget.textContent=visible?'Ẩn':'Hiện';event.currentTarget.setAttribute('aria-pressed',String(visible));
  });
  scrim?.addEventListener('click',()=>sidebarOpen(false));
  matchMedia('(min-width:1001px)').addEventListener?.('change',()=>sidebarOpen(false));
  if(sidebar)sidebarOpen(false);
  labels();
  new MutationObserver(records=>{for(const record of records)if(record.addedNodes.length)labels(record.target);}).observe(document.body,{childList:true,subtree:true});
  const observer=new MutationObserver(dialogState);
  document.querySelectorAll('.modal-backdrop').forEach(modal=>observer.observe(modal,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('keydown',event=>{
    const root=activeDialog||(sidebar?.classList.contains('open')?sidebar:null);
    if(event.key==='Escape'&&!activeDialog)sidebarOpen(false);
    if(event.key!=='Tab'||!root)return;
    const nodes=focusable(root),first=nodes[0],last=nodes.at(-1);
    if(!nodes.length){event.preventDefault();root.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();first.focus();}
  });
  document.addEventListener('input',event=>{
    const input=event.target;if('setCustomValidity'in input)input.setCustomValidity('');
    if(input.getAttribute('aria-invalid')==='true'){input.removeAttribute('aria-invalid');input.parentElement.querySelector('.field-error')?.remove();}
    input.closest('form')?.querySelectorAll('[data-form-feedback]').forEach(box=>box.hidden=true);
  });
  document.addEventListener('invalid',event=>{
    const input=event.target;input.setAttribute('aria-invalid','true');
    const field=input.closest('.field');if(!field)return;
    let note=field.querySelector('.field-error');if(!note){note=document.createElement('small');note.className='field-error';field.append(note);}
    note.textContent=input.validationMessage;
  },true);
  return{error,sidebarOpen,validateVariants,labels};
})();
