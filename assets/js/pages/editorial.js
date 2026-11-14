/* Content is editable in assets/data/editorial.js. */
PAUS_BOOT(() => {
  const { articles, collections } = window.PAUS_EDITORIAL, esc = PAUS.esc;
  const params = new URLSearchParams(location.search);
  const articleUrl = item => `article.html?slug=${encodeURIComponent(item.slug)}`;
  const articleCard = item => `<article class="journal-card" data-reveal><a href="${articleUrl(item)}"><div class="journal-cover"><img src="${esc(item.image)}" alt="${esc(item.title)}" width="520" height="380" loading="lazy"></div><span class="eyebrow">${esc(item.category)} / ${esc(item.read)}</span><h3>${esc(item.title)}</h3><p>${esc(item.intro)}</p><span class="text-arrow">Đọc bài viết ↗</span></a></article>`;
  function setMeta(title, description) {
    document.title = `${title} — PAUS`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `${location.origin}${location.pathname}${location.search}`;
  }
  function missing(root, type, back) {
    root.setAttribute("aria-busy", "false");
    root.innerHTML = `<section class="page-hero"><span class="eyebrow">PAUS / KHÔNG TÌM THẤY</span><h1 class="display">${type} chưa có ở đây.</h1><p class="lead">Đường dẫn có thể không còn chính xác. Mời bạn khám phá nội dung hiện có.</p><a href="${back}" class="btn dark">Quay lại ↗</a></section>`;
    setMeta("Không tìm thấy nội dung", "Khám phá các nội dung hiện có tại PAUS.");
  }
  const list = document.getElementById("collectionsList");
  if (list) list.innerHTML = collections.map(c => `<article class="collection-feature" data-reveal><img src="${esc(c.image)}" alt="${esc(c.vn)}" width="650" height="460" loading="lazy"><div><span class="eyebrow">${esc(c.no)} / ${esc(c.tag)}</span><h2>${esc(c.title)}</h2><p>${esc(c.intro)}</p><a class="text-arrow" href="collection.html?slug=${encodeURIComponent(c.slug)}">Xem bộ sưu tập ↗</a></div></article>`).join("");
  const collectionRoot = document.getElementById("collectionRoot");
  if (collectionRoot) {
    const c = collections.find(c => c.slug === params.get("slug"));
    if (!c) return missing(collectionRoot, "Gợi ý", "collections.html");
    setMeta(c.title, c.intro);
    collectionRoot.innerHTML = `<section class="page-hero"><div class="breadcrumbs"><a href="index.html">PAUS</a> / <a href="collections.html">BỘ SƯU TẬP</a> / ${esc(c.title)}</div><span class="eyebrow">${esc(c.tag)}</span><h1 class="display">${esc(c.vn)}</h1><p class="lead">${esc(c.intro)}</p></section><div class="collection-feature"><img src="${esc(c.image)}" alt="${esc(c.vn)}" width="650" height="460"><div><h2>${esc(c.title)}</h2>${c.details.map(d => `<p>${esc(d)}</p>`).join("")}</div></div><section class="section"><div class="section-head"><div><h2 class="section-title">Thử bắt đầu với những món này.</h2></div></div><div class="product-grid">${PRODUCTS.filter(p => p.active !== false && p.category === c.category).slice(0,8).map(PAUS.card).join("") || '<p>Danh mục đang được cập nhật.</p>'}</div><a class="btn dark" style="margin-top:30px" href="shop.html?category=${encodeURIComponent(c.category)}">Xem toàn bộ danh mục ↗</a></section>`;
    collectionRoot.setAttribute("aria-busy", "false");
  }
  const grid = document.getElementById("journalGrid");
  if (grid) {
    let category = params.get("category") || "Tất cả";
    const query = document.getElementById("journalSearch"); query.value = params.get("q") || "";
    const categories = ["Tất cả", ...new Set(articles.map(a => a.category))];
    if (!categories.includes(category)) category = "Tất cả";
    const normalize = text => String(text).toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    function render() {
      const results = articles.filter(a => (category === "Tất cả" || category === a.category) && normalize(a.title + " " + a.intro).includes(normalize(query.value.trim())));
      document.getElementById("journalTabs").innerHTML = categories.map(c => `<button type="button" data-topic="${esc(c)}" aria-pressed="${c === category}">${esc(c)}</button>`).join("");
      grid.innerHTML = results.length ? results.map(articleCard).join("") : '<div class="empty"><h2>Chưa có bài phù hợp.</h2><p>Thử từ khóa khác hoặc chọn “Tất cả”.</p></div>';
      document.getElementById("journalCount").textContent = `${results.length} bài viết`;
      const next = new URLSearchParams(); if (category !== "Tất cả") next.set("category", category); if (query.value.trim()) next.set("q", query.value.trim());
      history.replaceState(null, "", `journal.html${next.size ? `?${next}` : ""}`);
    }
    document.getElementById("journalTabs").addEventListener("click", e => { const btn = e.target.closest("[data-topic]"); if (btn) { category = btn.dataset.topic; render(); } });
    query.addEventListener("input", render); render();
  }
  const articleRoot = document.getElementById("articleRoot");
  if (articleRoot) {
    const article = articles.find(a => a.slug === params.get("slug"));
    if (!article) return missing(articleRoot, "Bài viết", "journal.html");
    setMeta(article.title, article.intro);
    articleRoot.innerHTML = `<section class="page-hero"><div class="breadcrumbs"><a href="index.html">PAUS</a> / <a href="journal.html">BÀI VIẾT</a> / ${esc(article.category)}</div><span class="eyebrow">${esc(article.category)} / ${esc(article.read)}</span><h1 class="display">${esc(article.title)}</h1></section><div class="article-layout"><article class="article-content"><img class="article-cover" src="${esc(article.image)}" width="800" height="500" alt="${esc(article.title)}"><p class="article-intro">${esc(article.intro)}</p>${article.sections.map(([title,...paras],i) => `<section><h2 id="section-${i}">${esc(title)}</h2>${paras.map(p => `<p>${esc(p)}</p>`).join("")}</section>`).join("")}<div class="article-tip">Cần kiểm tra thông tin của một sản phẩm cụ thể? Gửi tên mẫu hoặc đường dẫn cho PAUS trước khi đặt hàng.</div><a class="text-arrow" style="margin-top:28px" href="journal.html">← Tất cả bài viết</a></article><aside class="article-aside"><b>TRONG BÀI VIẾT</b>${article.sections.map(([title],i) => `<a href="#section-${i}">${esc(title)}</a>`).join("")}<a class="btn dark" href="contact.html">Nhờ PAUS hỗ trợ ↗</a></aside></div><section class="section"><div class="section-head"><div><h2 class="section-title">Có thể bạn muốn đọc.</h2></div></div><div class="journal-grid">${articles.filter(a => a !== article).slice(0,3).map(articleCard).join("")}</div></section>`;
    articleRoot.setAttribute("aria-busy", "false");
  }
});
