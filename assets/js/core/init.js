/* Shared keyboard behavior, form feedback and purposeful motion. */
window.PAUS_FORMS = {
  validate(form) {
    let first = null;
    form.querySelectorAll("input:not([type=radio]):not([type=checkbox]),textarea,select").forEach(input => {
      if (input.disabled || !input.name) return;
      const value=input.value.trim(); let message="";
      if (input.required && !value) message="Vui lòng điền thông tin này.";
      else if (input.name==="name" && value.length<2) message="Vui lòng nhập họ tên từ 2 ký tự.";
      else if (input.type==="email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message="Vui lòng nhập địa chỉ email hợp lệ.";
      else if (input.name==="phone" && !/^(?:\+84|0)\d{9,10}$/.test(value.replace(/[\s.-]/g,""))) message="Nhập số điện thoại hợp lệ, bắt đầu bằng 0 hoặc +84.";
      else if (input.name==="address" && value.length<8) message="Vui lòng nhập địa chỉ nhận hàng cụ thể hơn.";
      input.setAttribute("aria-invalid",String(Boolean(message)));
      const id=`${input.id||input.name}-error`;let error=document.getElementById(id);
      if(!error){error=document.createElement("small");error.id=id;error.className="field-error";error.setAttribute("aria-live","polite");input.insertAdjacentElement("afterend",error);input.setAttribute("aria-describedby",[input.getAttribute("aria-describedby"),id].filter(Boolean).join(" "));}
      error.textContent=message;if(message&&!first)first=input;
    });
    first?.focus();return !first;
  }
};
function initializeExperience(){
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const scrollBehavior=()=>reduced.matches?"instant":"smooth";
  document.querySelectorAll("main").forEach(main=>{if(!main.id)main.id="main";});
  document.querySelectorAll(".skip-link").forEach(link=>link.addEventListener("click",()=>{const main=document.getElementById("main");main?.setAttribute("tabindex","-1");main?.focus({preventScroll:true});}));
  // A single observer also handles content inserted by filters and page modules.
  let revealObserver=null;
  if(!reduced.matches&&"IntersectionObserver" in window){
    document.documentElement.classList.add("motion-ready");
    revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove("reveal-pending");revealObserver.unobserve(entry.target);}});},{threshold:.06});
  }
  const initialized=new WeakSet();
  function enhance(root=document){
    root.querySelectorAll("[data-reveal]").forEach(el=>{if(initialized.has(el))return;initialized.add(el);if(revealObserver&&el.getBoundingClientRect().top>innerHeight-25){el.classList.add("reveal-pending");revealObserver.observe(el);}});
    root.querySelectorAll(".accordion button,.faq-q").forEach((button,index)=>{
      const box=button.parentElement,content=box.querySelector(".accordion-content,.faq-a");if(!content)return;
      if(!content.id)content.id=`answer-${crypto.randomUUID?.()||index}`;
      button.setAttribute("aria-controls",content.id);button.setAttribute("aria-expanded",String(box.classList.contains("open")));content.hidden=!box.classList.contains("open");
    });
    root.querySelectorAll(".size-btn,.variant-btn").forEach(button=>button.setAttribute("aria-pressed",String(button.classList.contains("active"))));
    root.querySelectorAll('.qty button,.qty-picker button').forEach(button=>{if(!button.getAttribute("aria-label"))button.setAttribute("aria-label",button.textContent.includes("−")?"Giảm số lượng":"Tăng số lượng");});
    root.querySelectorAll("input[id='couponInput']").forEach(input=>input.setAttribute("aria-label","Mã giảm giá"));
  }
  enhance();
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==="childList"&&record.addedNodes.length){enhance(record.target);}
      if(record.type==="attributes"){
        const box=record.target;
        if(box.matches(".accordion,.faq-item")){const content=box.querySelector(".accordion-content,.faq-a"),button=box.querySelector("button");const open=box.classList.contains("open");button?.setAttribute("aria-expanded",String(open));if(content)content.hidden=!open;}
        if(box.matches(".size-btn,.variant-btn"))box.setAttribute("aria-pressed",String(box.classList.contains("active")));
      }
    }
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  reduced.addEventListener?.("change",()=>{if(reduced.matches){document.querySelectorAll(".reveal-pending").forEach(el=>el.classList.remove("reveal-pending"));revealObserver?.disconnect();}});
  // Focus and background state are restored for every overlay.
  const overlays=[...document.querySelectorAll("#mobileMenu,#cartDrawer,#searchOverlay,#quickModal")];
  let activeOverlay=null,returnFocus=null,inerted=[];
  const focusable=root=>[...root.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>!el.closest("[inert]")&&el.getClientRects().length&&!el.hidden);
  function updateOverlay(){
    const next=overlays.find(el=>el.classList.contains("open"))||null;
    if(next===activeOverlay)return;
    const previous=activeOverlay;
    inerted.forEach(([el,value])=>{el.inert=value;});inerted=[];
    if(!next){activeOverlay=null;document.body.classList.remove("lock");if(returnFocus?.isConnected&&previous)returnFocus.focus({preventScroll:true});return;}
    if(!previous)returnFocus=document.activeElement;
    activeOverlay=next;next.inert=false;document.body.classList.add("lock");
    for(const el of document.querySelectorAll('main,#siteFooter,#siteHeader')){
      if(el.contains(next)){const header=el.querySelector(".header");if(header){inerted.push([header,header.inert]);header.inert=true;}continue;}
      inerted.push([el,el.inert]);el.inert=true;
    }
    requestAnimationFrame(()=>{if(activeOverlay!==next)return;const target=next.querySelector("#globalSearch")||focusable(next)[0]||next;target.focus({preventScroll:true});});
  }
  const overlayObserver=new MutationObserver(updateOverlay);overlays.forEach(el=>overlayObserver.observe(el,{attributes:true,attributeFilter:["class"]}));
  matchMedia("(min-width: 1001px)").addEventListener?.("change",event=>{
    if(event.matches&&document.getElementById("mobileMenu")?.classList.contains("open"))document.getElementById("menuClose")?.click();
  });
  document.addEventListener("keydown",event=>{
    if(activeOverlay&&event.key==="Tab"){
      const nodes=focusable(activeOverlay),first=nodes[0],last=nodes.at(-1);
      if(!nodes.length){event.preventDefault();activeOverlay.focus();return;}
      if(event.shiftKey&&(document.activeElement===first||!activeOverlay.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!activeOverlay.contains(document.activeElement))){event.preventDefault();first.focus();}
    }
    if(event.key==="Escape"){
      document.querySelectorAll(".nav-dropdown.is-open").forEach(el=>{el.classList.remove("is-open");el.querySelector("button")?.setAttribute("aria-expanded","false");});
    }
  });
  document.addEventListener("focusin",event=>{if(activeOverlay&&!activeOverlay.contains(event.target)){(focusable(activeOverlay)[0]||activeOverlay).focus({preventScroll:true});}});
  document.querySelectorAll(".nav-dropdown-trigger").forEach(button=>button.addEventListener("click",()=>{const open=button.parentElement.classList.toggle("is-open");button.setAttribute("aria-expanded",String(open));}));
  document.addEventListener("click",event=>{if(!event.target.closest(".nav-dropdown"))document.querySelectorAll(".nav-dropdown.is-open").forEach(el=>{el.classList.remove("is-open");el.querySelector("button")?.setAttribute("aria-expanded","false");});});
  // Vercel clean URLs and static .html paths identify the same page.
  const pageName=path=>(path.split("/").filter(Boolean).pop()||"index").replace(/\.html$/i,"");
  const current=pageName(location.pathname),currentParams=new URLSearchParams(location.search);
  document.querySelectorAll('.desktop-nav>a,.mobile-menu>a,.footer-grid a').forEach(a=>{
    const target=new URL(a.getAttribute("href"),location.href);
    if(target.origin!==location.origin||target.hash||pageName(target.pathname)!==current)return;
    const category=target.searchParams.get("category");
    if(category?category!==currentParams.get("category"):current==="shop"&&currentParams.size>0)return;
    a.setAttribute("aria-current","page");
  });
  // Inline validation clears each field after it is corrected.
  document.querySelectorAll("#checkoutForm,#consultForm").forEach(form=>{
    form.addEventListener("input",event=>{if(event.target.getAttribute("aria-invalid")==="true"){event.target.removeAttribute("aria-invalid");const error=document.getElementById(`${event.target.id||event.target.name}-error`);if(error)error.textContent="";}});
  });
  // Image detail uses the browser's native dialog and native focus restoration.
  document.addEventListener("click",event=>{
    const trigger=event.target.closest("[data-zoom]");if(!trigger)return;
    const source=trigger.querySelector("img");let dialog=document.getElementById("imageZoom");
    if(!dialog){dialog=document.createElement("dialog");dialog.id="imageZoom";dialog.className="image-zoom";dialog.setAttribute("aria-label","Ảnh sản phẩm phóng lớn");dialog.innerHTML='<button type="button" class="zoom-close" aria-label="Đóng ảnh">×</button><img alt="">';document.body.append(dialog);dialog.querySelector("button").onclick=()=>dialog.close();dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});}
    dialog.querySelector("img").src=source.src;dialog.querySelector("img").alt=source.alt;dialog.showModal();
  });
  // Reveal a recoverable error instead of leaving an empty page after a module failure.
  window.addEventListener("paus:boot-error",()=>{
    const main=document.querySelector("main");if(main&&!document.querySelector(".error-banner"))main.insertAdjacentHTML("afterbegin",'<div class="error-banner" role="alert">Nội dung chưa tải đầy đủ. <a href="'+PAUS.esc(location.pathname+location.search)+'">Thử tải lại</a> hoặc <a href="contact.html">liên hệ PAUS</a>.</div>');
  });
  // Clear stale pre-studio caches before installing the new worker.
  if("serviceWorker" in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>{navigator.serviceWorker.register("/service-worker.js",{updateViaCache:"none"}).catch(()=>{});});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeExperience);else initializeExperience();
