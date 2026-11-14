PAUS_BOOT(() => {
  const links=document.getElementById("contactLinks"),form=document.getElementById("consultForm"),result=document.getElementById("contactResult");
  function renderLinks(){
  links.innerHTML=`<a target="_blank" rel="noopener" href="https://zalo.me/${encodeURIComponent(STORE_CONFIG.zaloPhone)}"><span>Zalo</span><b>${PAUS.esc(STORE_CONFIG.zaloPhone)} ↗</b></a><a href="tel:${PAUS.esc(STORE_CONFIG.hotline)}"><span>Điện thoại</span><b>${PAUS.esc(STORE_CONFIG.hotline)}</b></a><a href="mailto:${PAUS.esc(STORE_CONFIG.email)}"><span>Email</span><b>${PAUS.esc(STORE_CONFIG.email)}</b></a>${STORE_CONFIG.tiktok?`<a target="_blank" rel="noopener" href="${PAUS.esc(STORE_CONFIG.tiktok)}"><span>TikTok</span><b>Xem PAUS ↗</b></a>`:""}`;
  }
  renderLinks();
  document.addEventListener("paus:settings-ready",renderLinks);
  form.addEventListener("submit",event=>{
    event.preventDefault();if(!window.PAUS_FORMS.validate(form))return;
    const v=Object.fromEntries(new FormData(form).entries());
    const text=["PAUS — HỖ TRỢ CHỌN SẢN PHẨM","",`Tên: ${v.name.trim()}`,`Ngân sách: ${v.budget||"Chưa xác định"}`,`Nhóm sản phẩm: ${v.productType||""}`,`Size / số đo: ${v.size||""}`,`Phong cách & nhu cầu: ${v.style||""}`,`Sản phẩm quan tâm: ${v.history||""}`,"","Nhờ PAUS tư vấn giúp mình."].join("\n");
    result.hidden=false;result.innerHTML=`<h3>Nội dung đã sẵn sàng.</h3><p class="form-feedback">Tin nhắn chưa được gửi. Sao chép nội dung bên dưới, mở Zalo rồi dán vào cuộc trò chuyện với PAUS.</p><label class="sr-only" for="consultText">Nội dung tư vấn</label><textarea id="consultText">${PAUS.esc(text)}</textarea><div class="result-actions"><button class="btn dark" id="copyConsult" type="button">Sao chép nội dung</button><a class="btn light" href="https://zalo.me/${encodeURIComponent(STORE_CONFIG.zaloPhone)}" target="_blank" rel="noopener">Mở Zalo ↗</a></div><p id="copyStatus" role="status" class="form-feedback"></p>`;
    result.querySelector("#copyConsult").addEventListener("click",async()=>{const ok=await PAUS.copy(result.querySelector("textarea").value).catch(()=>false);document.getElementById("copyStatus").textContent=ok?"Đã sao chép. Bạn cần dán và nhấn gửi trong Zalo.":"Chưa sao chép được. Hãy chọn nội dung trong ô và sao chép thủ công.";});
    result.scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  });
});
