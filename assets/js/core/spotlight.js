/* Automatic color showcase; independent from catalog/network startup. */
PAUS_BOOT(() => {
  const stage=document.querySelector('.hero-stage');if(!stage)return;
  const product=window.PAUS_CATALOG?.resolve('nike-nike-v2k-run-grey-pink')||PAUS.product(64);
  if(!product)return;
  const variants=PAUS.variants(product).filter(v=>v.image&&Number(v.stock)>0);
  if(variants.length<2)return;
  const image=stage.querySelector('.hero-shoe'),link=stage.querySelector('a'),caption=stage.querySelector('.stage-bottom b');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const icon=paths=>`<svg viewBox="0 0 20 20" aria-hidden="true">${paths}</svg>`;
  const icons={prev:icon('<path d="m12 5-5 5 5 5"/>'),next:icon('<path d="m8 5 5 5-5 5"/>'),pause:icon('<path d="M7 5v10M13 5v10"/>'),play:icon('<path d="m7 4 9 6-9 6V4Z"/>')};
  let index=0,paused=reduced.matches,hovered=false,focused=false,inView=true,timer=null,generation=0;
  stage.insertAdjacentHTML('beforeend',`<div class="hero-playback" role="group" aria-label="Điều khiển màu sản phẩm"><button type="button" data-spot-prev aria-label="Màu trước">${icons.prev}</button><small data-spot-count aria-hidden="true"></small><button type="button" data-spot-pause aria-label="Tạm dừng tự động đổi màu">${icons.pause}</button><button type="button" data-spot-next aria-label="Màu tiếp theo">${icons.next}</button></div>`);
  const pauseButton=stage.querySelector('[data-spot-pause]'),count=stage.querySelector('[data-spot-count]');
  function schedule(){clearTimeout(timer);if(!paused&&!hovered&&!focused&&inView&&!document.hidden&&!reduced.matches)timer=setTimeout(()=>show(index+1),4500);}
  function controls(){pauseButton.disabled=reduced.matches;pauseButton.innerHTML=paused?icons.play:icons.pause;pauseButton.setAttribute('aria-label',paused?'Bật tự động đổi màu':'Tạm dừng tự động đổi màu');pauseButton.setAttribute('aria-pressed',String(paused));count.textContent=`${index+1}/${variants.length}`;}
  async function show(next){
    const target=(next+variants.length)%variants.length,ticket=++generation,variant=variants[target];
    const preload=new Image();preload.src=variant.image;try{await preload.decode();}catch{schedule();return;}
    if(ticket!==generation)return;
    index=target;image.src=variant.image;image.alt=`${product.brand} ${product.name} · ${variant.label}`;
    link.href=`${PAUS.productUrl(product)}&variant=${encodeURIComponent(variant.id)}`;link.setAttribute('aria-label',`Xem ${product.name} · ${variant.label}`);
    caption.textContent=`${product.name} · ${variant.label}`;
    if(!reduced.matches)image.animate?.([{opacity:.15,transform:'translate(15px,8px) rotate(-14deg)'},{opacity:1,transform:'translate(0,0) rotate(-17deg)'}],{duration:550,easing:'cubic-bezier(.2,.75,.25,1)'});
    controls();schedule();
  }
  stage.querySelector('[data-spot-prev]').addEventListener('click',()=>{paused=true;show(index-1);});
  stage.querySelector('[data-spot-next]').addEventListener('click',()=>{paused=true;show(index+1);});
  pauseButton.addEventListener('click',()=>{paused=!paused;controls();schedule();});
  stage.addEventListener('mouseenter',()=>{hovered=true;schedule();});stage.addEventListener('mouseleave',()=>{hovered=false;schedule();});
  stage.addEventListener('focusin',()=>{focused=true;schedule();});stage.addEventListener('focusout',event=>{if(!stage.contains(event.relatedTarget)){focused=false;schedule();}});
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener?.('change',()=>{if(reduced.matches)paused=true;controls();schedule();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(stage);
  controls();schedule();
}, {waitForData:false});
