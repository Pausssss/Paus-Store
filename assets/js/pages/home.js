PAUS_BOOT(() => {
  const brandStrip=document.getElementById("brandStrip");if(brandStrip)brandStrip.innerHTML=(window.PAUS_BRANDS||[]).map(b=>`<a href="shop.html?brand=${encodeURIComponent(b.filter)}" aria-label="Xem ${PAUS.esc(b.label)}">${PAUS.brandMark(b.filter)}<span class="sr-only">${PAUS.esc(b.label)}</span></a>`).join("");
  function renderFeatured(){
  const featured = document.getElementById("featuredGrid");
  const picked = ["nike-nike-v2k-run-grey-pink","mlb-flare-mary-jane","jordan-jordan-1-low-panda","nike-nike-v2k-run-summit-white-metallic-silver"].map(slug=>(window.PAUS_CATALOG?.resolve(slug)||PRODUCTS.find(p=>p.slug===slug))).filter(p => p && p.active !== false);
  if (featured) {
    featured.innerHTML = [...new Map([...picked,...PRODUCTS.filter(p=>p.active!==false)].map(p=>[p.id,p])).values()].slice(0,4).map(PAUS.card).join("") || '<p>Danh mục đang được cập nhật. <a href="contact.html">Liên hệ PAUS</a></p>';
    featured.setAttribute("aria-busy", "false");
  }
  }
  renderFeatured();
  document.addEventListener("paus:catalog-ready",renderFeatured);
  const journal = document.getElementById("homeJournal");
  if (journal) journal.innerHTML = window.PAUS_EDITORIAL.articles.slice(0,3).map((a,i) => `<article class="journal-card" data-reveal><a href="article.html?slug=${encodeURIComponent(a.slug)}"><div class="journal-cover"><span aria-hidden="true">0${i+1}</span><img src="${PAUS.esc(a.image)}" width="520" height="380" alt="${PAUS.esc(a.title)}" loading="lazy"></div><span class="eyebrow">${PAUS.esc(a.category)} / ${PAUS.esc(a.read)}</span><h3>${PAUS.esc(a.title)}</h3><p>${PAUS.esc(a.intro)}</p><span class="text-arrow">Đọc bài viết ↗</span></a></article>`).join("");
  const form = document.getElementById("newsletterForm");
  form?.addEventListener("submit", async event => {
    event.preventDefault(); const feedback = document.getElementById("newsletterFeedback"), button = form.querySelector("button");
    if (!form.reportValidity() || button.disabled) return;
    button.disabled = true; button.textContent = "Đang gửi…"; feedback.className = "form-feedback"; feedback.textContent = "Đang kiểm tra kết nối…";
    try {
      const result = await PAUS_BACKEND.subscribeNewsletter(form.elements.email.value);
      if (result?.mode !== "supabase" || !result?.ok) throw new Error("Chưa nhận được xác nhận từ hệ thống.");
      feedback.className = "form-feedback success"; feedback.textContent = "Email đã được hệ thống tiếp nhận. Cảm ơn bạn đã kết nối với PAUS."; form.reset();
    } catch (error) { feedback.className = "form-feedback error"; feedback.textContent = error.message || "Chưa thể đăng ký. Vui lòng thử lại sau."; }
    finally { button.disabled = false; button.textContent = "Đăng ký ↗"; }
  });
}, {waitForData:false});
