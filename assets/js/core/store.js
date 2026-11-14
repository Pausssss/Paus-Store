/**
 * PAUS STORE 4.1 PRO — Core storefront utilities
 * Cart / wishlist / local order history stay on the customer device.
 * Product/catalog data can come from Supabase through backend.js.
 */
const PAUS = (() => {
  const keys = {
    cart: "paus_fashion_cart_v6",
    wish: "paus_fashion_wishlist_v6",
    recent: "paus_fashion_recent_v6",
    orders: "paus_fashion_orders_v6",
  };

  // Assets are copied from official brand websites, not redrawn or generated.
  const NAV_BRANDS = window.PAUS_BRANDS || [];
  function brandMark(brand, className = "inline-brandmark") {
    const b=NAV_BRANDS.find(b=>b.filter===brand);
    return b ? `<span class="brand-mark ${b.dark?'on-dark':''}"><img class="${className}" src="${esc(b.logo)}" alt="" width="100" height="36" loading="lazy"></span>` : "";
  }
  function brandMenuItems(className = "brand-menu-item") {
    return NAV_BRANDS.map(({filter,label}) => `<a class="${className}" href="shop.html?brand=${encodeURIComponent(filter)}">${brandMark(filter)}<span class="brand-name">${esc(label)}</span></a>`).join("");
  }

  function get(key, fallback = []) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(fallback) ? (Array.isArray(value) ? value : fallback) : (value ?? fallback);
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {
      throw new Error("Trình duyệt chưa cho phép lưu dữ liệu. Vui lòng bật lưu trữ để dùng giỏ hàng và yêu thích.");
    }
  }

  function money(value) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      }[char];
    });
  }

  function product(id) {
    const resolved = window.PAUS_CATALOG?.resolve(id);
    return resolved?.active !== false && resolved ? resolved : PRODUCTS.find(item=>item.active!==false&&String(item.id)===String(id));
  }

  function variants(item) {
    const list = Array.isArray(item?.variants) ? item.variants.filter(Boolean) : [];
    if (list.length) return list;
    return [
      {
        id: "default",
        label: "Mặc định",
        image: item?.image || "assets/images/product-fallback.svg",
        gallery: item?.gallery || [],
        sizes: item?.sizes || {},
        stock: Number(item?.stock || 0),
      },
    ];
  }

  function variant(item, variantId) {
    const list = variants(item);
    return list.find((entry) => String(entry.id) === String(variantId)) || list[0] || null;
  }

  function sizePrice(item, variantId, size) {
    const selected = variant(item, variantId);
    const raw = selected?.sizes?.[size];
    if (raw && typeof raw === "object") return Number(raw.price || 0);
    return Number(raw || 0);
  }

  function variantImage(item, variantId) {
    return variant(item, variantId)?.image || item?.image || "assets/images/product-fallback.svg";
  }
  function minPrice(item) {
    const prices = variants(item)
      .flatMap((entry) =>
        Object.values(entry?.sizes || {}).map((raw) =>
          Number(raw && typeof raw === "object" ? raw.price : raw),
        ),
      )
      .filter((price) => Number.isFinite(price) && price > 0);
    return prices.length ? Math.min(...prices) : 0;
  }

  function productUrl(item) {
    return `product.html?id=${encodeURIComponent(item.id)}`;
  }
  function cart() {
    const raw=get(keys.cart),cleaned=[];
    for (const saved of raw) {
      if(!saved||typeof saved!=="object")continue;
      const item=product(saved.id);if(!item)continue;
      const mapped=window.PAUS_CATALOG?.resolveChoice(saved.id,saved.variant);
      const variantId=mapped?.variant||saved.variant;
      const v=variants(item).find(v=>v.id===variantId);
      if(!v||Number(v.stock)<=0||sizePrice(item,v.id,saved.size)<=0||!Number.isInteger(Number(saved.qty))||saved.qty<=0||saved.qty>20)continue;
      const line={id:item.id,variant:v.id,size:saved.size,qty:Number(saved.qty)};
      const hit=cleaned.find(x=>x.id===line.id&&x.variant===line.variant&&x.size===line.size);
      if(hit)hit.qty=Math.min(20,Number(v.stock),hit.qty+line.qty);else cleaned.push(line);
    }
    if(JSON.stringify(raw)!==JSON.stringify(cleaned))set(keys.cart,cleaned);
    return cleaned;
  }
  function wishlist() {
    const raw=get(keys.wish),cleaned=[...new Set(raw.map(id=>product(id)?.id).filter(id=>id!=null))];
    if(JSON.stringify(raw)!==JSON.stringify(cleaned))set(keys.wish,cleaned);
    return cleaned;
  }

  function orders() {
    return get(keys.orders);
  }

  function cartCount() {
    return cart().reduce((total, line) => total + Number(line.qty || 0), 0);
  }
  function cartSubtotal() {
    return cart().reduce((total, line) => {
      const item = product(line.id);
      return total + sizePrice(item, line.variant, line.size) * Number(line.qty || 0);
    }, 0);
  }
  function addCart(id, variantId, size, qty = 1) {
    const item = product(id);
    if (!item) return;
    const selectedVariant = variant(item, variantId);
    if (!selectedVariant || Number(selectedVariant.stock) <= 0) { toast("Phiên bản này hiện chưa có sẵn."); return; }
    const availableSizes = Object.keys(selectedVariant.sizes || {}).filter(
      (key) => sizePrice(item, selectedVariant.id, key) > 0,
    );
    const selectedSize = size || availableSizes[0];
    if (!selectedSize || sizePrice(item, selectedVariant.id, selectedSize) <= 0) return;
    const quantity = Math.max(1, Math.min(20, Math.floor(Number(qty) || 1), Number(selectedVariant.stock) || 20));
    const list = cart();
    const hit = list.find(
      (line) =>
        line.id === item.id && line.variant === selectedVariant.id && line.size === selectedSize,
    );
    if (hit) hit.qty = Math.min(20, Number(selectedVariant.stock) || 20, Number(hit.qty || 0) + quantity);
    else list.push({ id: item.id, variant: selectedVariant.id, size: selectedSize, qty: quantity });
    set(keys.cart, list);
    syncBadges();
    toast(`Đã thêm ${item.name} · ${selectedVariant.label} · ${selectedSize}`);
    renderCartDrawer();
  }
  function updateCart(id, variantId, size, qty) {
    const list = cart();
    const hit = list.find(
      (line) => line.id === Number(id) && line.variant === variantId && line.size === size,
    );
    if (!hit) return;
    const item = product(id); const v = variant(item, variantId);
    hit.qty = Math.max(1, Math.min(20, Math.floor(Number(qty) || 1), Number(v.stock) || 20));
    set(keys.cart, list);
    syncBadges();
    renderCartDrawer();
  }
  function removeCart(id, variantId, size) {
    const next = cart().filter(
      (line) => !(line.id === Number(id) && line.variant === variantId && line.size === size),
    );
    set(keys.cart, next);
    syncBadges();
    renderCartDrawer();
  }

  function clearCart() {
    set(keys.cart, []);
    syncBadges();
    renderCartDrawer();
  }

  function toggleWish(id) {
    const productId = product(id)?.id ?? Number(id);
    let list = wishlist();

    if (list.includes(productId)) {
      list = list.filter((itemId) => itemId !== productId);
      toast("Đã bỏ khỏi yêu thích");
    } else if (product(productId)) {
      list.push(productId);
      toast("Đã lưu vào yêu thích");
    }

    set(keys.wish, list);
    syncBadges();

    document.querySelectorAll(`[data-wish='${productId}']`).forEach((button) => {
      button.classList.toggle("active", list.includes(productId));
      button.setAttribute("aria-pressed", String(list.includes(productId)));
    });

    return list.includes(productId);
  }

  function syncBadges() {
    const cartTotal = cartCount();
    const wishTotal = wishlist().length;

    document.querySelectorAll("[data-cart-count]").forEach((element) => {
      element.textContent = cartTotal;
      element.hidden = cartTotal === 0;
    });

    document.querySelectorAll("[data-wish-count]").forEach((element) => {
      element.textContent = wishTotal;
      element.hidden = wishTotal === 0;
    });
  }

  function toast(message) {
    let element = document.getElementById("toast");

    if (!element) {
      element = document.createElement("div");
      element.id = "toast";
      element.className = "toast";
      document.body.appendChild(element);
    }

    element.textContent = message;
    element.classList.add("show");
    clearTimeout(window.__pausToast);
    window.__pausToast = setTimeout(() => {
      element.classList.remove("show");
    }, 2200);
  }

  function productDescription(item) {
    const text=String(item.description||"").trim();
    const generated=/\.(?:\s+)(?:Chọn size\/phiên bản đang có sẵn để đặt hàng|Chọn màu \/ phiên bản trước, sau đó chọn đúng size còn khả dụng|Các màu \/ phiên bản được gom trong cùng một mẫu; mỗi lựa chọn giữ ảnh, size và giá riêng)\.$/u;
    return generated.test(text) ? "" : text;
  }

  function card(item) {
    const wished = wishlist().includes(item.id);
    const mark=brandMark(item.brand);
    const category={Sneakers:"Giày","Slides & Sandals":"Dép & sandals",Apparel:"Thời trang","Bags & Accessories":"Phụ kiện"}[item.category]||item.category;

    return `
      <article class="product-card">
        <div class="pc-media">
          <a href="${productUrl(item)}">
            <img
              loading="lazy" width="480" height="560"
              src="${esc(item.image)}"
              alt="${esc(`${item.brand} ${item.name}`)}"
              onerror="this.onerror=null;this.src='assets/images/product-fallback.svg'"
            >
          </a>
          ${item.badge ? `<span class="pc-badge">${esc(item.badge)}</span>` : ""}
          <button
            class="wish-btn ${wished ? "active" : ""}"
            data-wish="${item.id}"
            aria-label="Lưu ${esc(item.brand + ' ' + item.name)} vào yêu thích" aria-pressed="${wished}"
            type="button"
          >♡</button>
          <button
            class="quick-btn"
            data-quick="${item.id}"
            type="button"
          >Xem nhanh</button>
        </div>
        <div class="pc-body">
          <div class="pc-brand">${mark}<span${mark?' class="sr-only"':''}>${esc(item.brand==='Other'?'Khác':item.brand)}</span></div>
          <h3><a href="${productUrl(item)}">${esc(item.name)}</a></h3>
          <div class="pc-meta">
            ${Number(item.reviews || 0) > 0 ? `<span>★ ${Number(item.rating || 0).toFixed(1)}</span>` : ""}
            <span>${esc(category)}</span>
            ${variants(item).length > 1 ? `<span>${item.colorCount || variants(item).length} lựa chọn</span>` : ""}
          </div>
          ${variants(item).length>1 ? `<div class="pc-colors" aria-label="Các màu của ${esc(item.name)}">${variants(item).slice(0,5).map((v,i)=>`<button type="button" class="pc-color ${i===0?'active':''}" data-card-variant="${esc(v.id)}" data-product="${item.id}" aria-label="Xem ${esc(v.label)}" aria-pressed="${i===0}"><img src="${esc(v.image)}" alt="" width="30" height="30" loading="lazy"></button>`).join("")}${variants(item).length>5?`<a class="more-colors" href="${productUrl(item)}" aria-label="Xem đủ ${variants(item).length} lựa chọn">+${variants(item).length-5}</a>`:""}</div>` : `<div class="pc-colors color-placeholder" aria-hidden="true"></div>`}
          <div class="pc-foot">
            <b>Từ ${money(minPrice(item))}</b>
            <button
              class="mini-add"
              data-add-default="${item.id}"
              aria-label="Chọn màu và size của ${esc(item.name)}"
              type="button"
            >＋</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderShell() {
    const header = document.getElementById("siteHeader"), footer = document.getElementById("siteFooter");
    if (header) header.innerHTML = `
      <header class="header"><div class="container navrow">
        <button class="menu-btn" id="menuBtn" aria-label="Mở menu" aria-controls="mobileMenu" aria-expanded="false" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button>
        <a class="logo" href="index.html" aria-label="PAUS — Trang chủ"><span>${esc(STORE_CONFIG.brand)}</span></a>
        <nav class="desktop-nav" aria-label="Điều hướng chính">
          <a href="index.html">Trang chủ</a>
          <a href="shop.html?category=Sneakers">Giày</a>
          <a href="shop.html?category=Apparel">Thời trang</a>
          <a href="shop.html?category=Bags%20%26%20Accessories">Phụ kiện</a>
          <a href="collections.html">Bộ sưu tập</a>
          <div class="nav-dropdown"><button class="nav-dropdown-trigger" type="button" aria-controls="brandMenu" aria-expanded="false">Thương hiệu <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 4.5 3.5 3 3.5-3"/></svg></button><div class="nav-dropdown-menu" id="brandMenu" aria-label="Danh sách thương hiệu">${brandMenuItems()}</div></div>
        </nav>
        <div class="nav-actions"><button class="nav-icon" data-open-search aria-label="Tìm kiếm sản phẩm" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></button><a class="nav-icon" href="wishlist.html" aria-label="Sản phẩm yêu thích"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg><i data-wish-count hidden>0</i></a><button class="nav-icon" data-open-cart aria-label="Mở giỏ hàng" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg><i data-cart-count hidden>0</i></button></div>
      </div></header>
      <div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Menu điều hướng" tabindex="-1" inert>
        <div class="mm-top"><b>PAUS</b><button id="menuClose" type="button" aria-label="Đóng menu">×</button></div>
        <a href="index.html">Trang chủ</a>
        <a href="shop.html?category=Sneakers">Giày & sneaker</a>
        <a href="shop.html?category=Slides%20%26%20Sandals">Dép & sandals</a>
        <a href="shop.html?category=Apparel">Thời trang</a>
        <a href="shop.html?category=Bags%20%26%20Accessories">Túi & phụ kiện</a>
        <a href="collections.html">Bộ sưu tập</a>
        <div class="mm-label mm-label-spaced">THƯƠNG HIỆU</div><div class="mobile-brand-grid">${brandMenuItems("mobile-brand-item")}</div>
        <div class="mm-label mm-label-spaced">HỖ TRỢ</div><a href="journal.html">Bài viết</a><a href="size-guide.html">Hướng dẫn chọn size</a><a href="about.html">Về PAUS</a><a href="contact.html">Liên hệ</a>
      </div><div class="scrim" id="menuScrim"></div>`;
    if (footer) footer.innerHTML = `<footer class="footer"><div class="container footer-grid">
      <div><a class="logo footer-logo" href="index.html" aria-label="PAUS — Trang chủ"><span>${esc(STORE_CONFIG.brand)}</span></a><p>Giày, thời trang và phụ kiện.</p><a class="text-arrow" href="about.html">Về PAUS ↗</a></div>
      <div><b>KHÁM PHÁ</b><a href="index.html">Trang chủ</a><a href="shop.html">Tất cả sản phẩm</a><a href="collections.html">Bộ sưu tập</a><a href="journal.html">Bài viết</a></div>
      <div><b>HỖ TRỢ</b><a href="size-guide.html">Hướng dẫn chọn size</a><a href="faq.html">Câu hỏi thường gặp</a><a href="policies.html#shipping">Giao hàng & đổi trả</a><a href="orders.html">Đơn hàng đã lưu</a></div>
      <div><b>LIÊN HỆ</b><a data-contact-zalo href="https://zalo.me/${encodeURIComponent(STORE_CONFIG.zaloPhone)}" target="_blank" rel="noopener">Zalo / ${esc(STORE_CONFIG.zaloPhone)} ↗</a><a data-contact-phone href="tel:${esc(STORE_CONFIG.hotline)}">${esc(STORE_CONFIG.hotline)}</a><a data-contact-email href="mailto:${esc(STORE_CONFIG.email)}">${esc(STORE_CONFIG.email)}</a><a href="contact.html">Nhắn PAUS ↗</a></div>
      </div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} PAUS Store.</span><a href="policies.html#privacy">Quyền riêng tư & điều khoản</a></div></footer>`;
    ensureOverlays(); syncBadges(); bindGlobal();
    document.dispatchEvent(new CustomEvent("paus:shell-ready"));
  }

  function ensureOverlays() {
    if (document.getElementById("cartDrawer")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="drawer-scrim" id="drawerScrim"></div>
        <aside class="cart-drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-label="Giỏ hàng" tabindex="-1" inert>
          <div class="drawer-head">
            <div><small>PAUS</small><h3>Giỏ hàng</h3></div>
            <button id="closeCart" type="button" aria-label="Đóng giỏ hàng">×</button>
          </div>
          <div id="drawerCartList" class="drawer-list"></div>
          <div id="drawerCartFoot" class="drawer-foot"></div>
        </aside>

        <div class="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Tìm kiếm sản phẩm" tabindex="-1" inert>
          <div class="search-panel">
            <div class="search-head">
              <span>Tìm kiếm</span>
              <button id="closeSearch" type="button" aria-label="Đóng tìm kiếm">×</button>
            </div>
            <label class="search-big">
              <span>⌕</span>
              <input
                id="globalSearch" aria-label="Tên sản phẩm hoặc thương hiệu"
                autocomplete="off"
                placeholder="Tìm sản phẩm, thương hiệu, phong cách..."
              >
            </label>
            <div id="searchResults" class="search-results" aria-live="polite"></div>
          </div>
        </div>

        <div class="quick-modal" id="quickModal" role="dialog" aria-modal="true" aria-label="Xem nhanh sản phẩm" tabindex="-1" inert>
          <div class="quick-box" id="quickBox"></div>
        </div>

        <div id="toast" class="toast" role="status" aria-live="polite"></div>
      `,
    );
  }

  function bindGlobal() {
    document.addEventListener("click", (event) => {
      const openCartButton = event.target.closest("[data-open-cart]");
      const wishButton = event.target.closest("[data-wish]");
      const addButton = event.target.closest("[data-add-default]");
      const quickButton = event.target.closest("[data-quick]");
      const minusButton = event.target.closest("[data-cart-minus]");
      const plusButton = event.target.closest("[data-cart-plus]");
      const removeButton = event.target.closest("[data-cart-remove]");

      const colorButton=event.target.closest("[data-card-variant]");
      if(colorButton){
        event.preventDefault();const item=product(colorButton.dataset.product),v=variant(item,colorButton.dataset.cardVariant),card=colorButton.closest(".product-card");
        if(item&&v&&card){
          card.dataset.selectedVariant=v.id;
          card.querySelector(".pc-foot b").textContent="Từ "+money(minPrice({...item,variants:[v]}));
          const image=card.querySelector(".pc-media>a img");image.src=v.image;image.alt=`${item.brand} ${item.name} · ${v.label}`;
          if(!matchMedia("(prefers-reduced-motion: reduce)").matches)image.animate?.([{opacity:.3,transform:"scale(.97)"},{opacity:1,transform:"scale(1)"}],{duration:250,easing:"ease-out"});
          card.querySelectorAll("[data-card-variant]").forEach(b=>{const on=b===colorButton;b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));});
          card.querySelectorAll(".pc-media>a,.pc-body h3 a").forEach(a=>a.href=`${productUrl(item)}&variant=${encodeURIComponent(v.id)}`);
        }
      }
      if (openCartButton) {
        event.preventDefault();
        openCart();
      }

      if (wishButton) {
        event.preventDefault();
        toggleWish(wishButton.dataset.wish);
      }

      if (addButton) {
        event.preventDefault();
        const item = product(addButton.dataset.addDefault);
        if (item) {
          openQuick(item.id,addButton.closest(".product-card")?.dataset.selectedVariant);
        }
      }

      if (quickButton) {
        event.preventDefault();
        openQuick(quickButton.dataset.quick,quickButton.closest(".product-card")?.dataset.selectedVariant);
      }

      if (event.target.closest("[data-open-search]")) {
        event.preventDefault();
        openSearch();
      }

      if (event.target.id === "drawerScrim" || event.target.id === "closeCart") {
        closeCart();
      }

      if (event.target.id === "searchOverlay" || event.target.id === "closeSearch") {
        closeSearch();
      }

      if (event.target.id === "quickModal" || event.target.closest("[data-close-quick]")) {
        closeQuick();
      }

      if (minusButton) {
        const [id, variantId, size] = minusButton.dataset.cartMinus.split("|");
        const hit = cart().find(
          (line) => line.id === Number(id) && line.variant === variantId && line.size === size,
        );
        if (hit) updateCart(id, variantId, size, hit.qty - 1);
      }

      if (plusButton) {
        const [id, variantId, size] = plusButton.dataset.cartPlus.split("|");
        const hit = cart().find(
          (line) => line.id === Number(id) && line.variant === variantId && line.size === size,
        );
        if (hit) updateCart(id, variantId, size, hit.qty + 1);
      }

      if (removeButton) {
        const [id, variantId, size] = removeButton.dataset.cartRemove.split("|");
        removeCart(id, variantId, size);
      }
    });

    const menuButton = document.getElementById("menuBtn");
    const menuClose = document.getElementById("menuClose");
    const menuScrim = document.getElementById("menuScrim");

    function toggleMenu(open) {
      const menu = document.getElementById("mobileMenu");
      if (menu) menu.inert = !open;
      menuButton?.setAttribute("aria-expanded", String(open));
      menu?.classList.toggle("open", open);
      menuScrim?.classList.toggle("show", open);
      document.body.classList.toggle("lock", open);
    }

    menuButton?.addEventListener("click", () => toggleMenu(true));
    menuClose?.addEventListener("click", () => toggleMenu(false));
    menuScrim?.addEventListener("click", () => toggleMenu(false));
    document.getElementById("mobileMenu")?.addEventListener("click", event => {
      if (event.target.closest("a[href]")) toggleMenu(false);
    });

    document
      .getElementById("globalSearch")
      ?.addEventListener("input", (event) => renderSearch(event.target.value));

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeCart();
      closeSearch();
      closeQuick();
      toggleMenu(false);
    });
  }

  function openCart() {
    renderCartDrawer();
    window.PAUS_BACKEND?.ensureCatalog?.().then(()=>{
      if(document.getElementById("cartDrawer")?.classList.contains("open"))renderCartDrawer();
    }).catch(()=>{});
    document.getElementById("cartDrawer").inert = false;
    document.getElementById("cartDrawer")?.classList.add("open");
    document.getElementById("drawerScrim")?.classList.add("show");
    document.body.classList.add("lock");
  }

  function closeCart() {
    if (document.getElementById("cartDrawer")) document.getElementById("cartDrawer").inert = true;
    document.getElementById("cartDrawer")?.classList.remove("open");
    document.getElementById("drawerScrim")?.classList.remove("show");
    document.body.classList.remove("lock");
  }
  function renderCartDrawer() {
    const list = document.getElementById("drawerCartList");
    const footer = document.getElementById("drawerCartFoot");
    if (!list || !footer) return;
    const cartLines = cart();
    if (!cartLines.length) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">◇</div><h3>Giỏ hàng đang trống</h3><p>Khám phá bộ sưu tập và chọn sản phẩm phù hợp với phong cách của bạn.</p><a class="btn dark" href="shop.html">Xem sản phẩm</a></div>`;
      footer.innerHTML = "";
      return;
    }
    list.innerHTML = cartLines
      .map((line) => {
        const item = product(line.id);
        if (!item) return "";
        const v = variant(item, line.variant);
        const token = `${line.id}|${v.id}|${line.size}`;
        return `<div class="cart-line">
        <img src="${esc(variantImage(item, v.id))}" alt="${esc(item.name)}" onerror="this.src='assets/images/product-fallback.svg'">
        <div><b>${esc(item.name)}</b><small>${esc(item.brand)} · ${esc(v.label)} · Size ${esc(line.size)}</small>
        <span>${money(sizePrice(item, v.id, line.size))}</span><div class="qty">
        <button data-cart-minus="${esc(token)}" type="button">−</button><b>${line.qty}</b><button data-cart-plus="${esc(token)}" type="button">＋</button></div></div>
        <button class="line-remove" data-cart-remove="${esc(token)}" type="button" aria-label="Xóa sản phẩm">×</button></div>`;
      })
      .join("");
    const subtotal = cartSubtotal();
    const threshold = Math.max(0, Number(STORE_CONFIG.freeShipThreshold || 0));
    const left = Math.max(0, threshold - subtotal);
    const progress = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 0;
    footer.innerHTML = `${threshold > 0 ? `<div class="ship-progress"><span style="width:${progress}%"></span></div><small>${left ? `Mua thêm ${money(left)} để được miễn phí giao tiêu chuẩn` : "Đủ ngưỡng miễn phí giao tiêu chuẩn"}</small>` : `<small>Phí vận chuyển được hiển thị ở bước hoàn tất đơn.</small>`}<div class="sum"><span>Tạm tính</span><b>${money(subtotal)}</b></div><a class="btn dark full" href="checkout.html">Thanh toán</a><a class="btn light full" href="cart.html">Xem giỏ hàng</a>`;
  }

  function openSearch() {
    document.getElementById("searchOverlay").inert = false;
    document.getElementById("searchOverlay")?.classList.add("open");
    document.body.classList.add("lock");
    setTimeout(() => document.getElementById("globalSearch")?.focus(), 60);
    renderSearch("");
    window.PAUS_BACKEND?.ensureCatalog?.().then(()=>{
      if(document.getElementById("searchOverlay")?.classList.contains("open"))renderSearch(document.getElementById("globalSearch")?.value||"");
    }).catch(()=>{});
  }

  function closeSearch() {
    if (document.getElementById("searchOverlay")) document.getElementById("searchOverlay").inert = true;
    document.getElementById("searchOverlay")?.classList.remove("open");
    document.body.classList.remove("lock");
  }

  function renderSearch(query) {
    const box = document.getElementById("searchResults");
    if (!box) return;

    const normalized = String(query || "")
      .trim()
      .toLowerCase();

    const result = normalized
      ? PRODUCTS.filter((item) => {
          if (item.active === false) return false;
          const haystack = [
            item.brand,
            item.name,
            item.category,
            item.collection,
            item.style,
            ...(item.features || []), ...(item.sourceNames || []), ...variants(item).map(v=>v.label),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalized);
        })
      : PRODUCTS.filter((item) => item.active !== false && item.featured).slice(0, 4);

    const items = result.length
      ? result
          .slice(0, 8)
          .map(
            (item) => `
              <a class="search-item" href="${productUrl(item)}">
                <img
                  src="${esc(item.image)}"
                  alt="${esc(item.name)}"
                  onerror="this.src='assets/images/product-fallback.svg'"
                >
                <div>
                  <b>${esc(item.name)}</b>
                  <span>${esc(item.brand)} · Từ ${money(minPrice(item))}</span>
                </div>
                <em>→</em>
              </a>
            `,
          )
          .join("")
      : '<div class="noresult">Không tìm thấy sản phẩm phù hợp.</div>';

    box.innerHTML = `
      <div class="sr-title">${normalized ? "Kết quả" : "Gợi ý nổi bật"}</div>
      ${items}
    `;
  }
  function openQuick(id, preferredVariant) {
    const item = product(id);
    const box = document.getElementById("quickBox");
    if (!item || !box) return;
    const variantList = variants(item);
    if (!variantList.length) return;
    let selectedVariant = variantList.find(v=>v.id===preferredVariant)||variantList[0];
    let selectedSize = "";
    const validSizes = (v) =>
      Object.entries(v.sizes || {}).filter(([size]) => sizePrice(item, v.id, size) > 0);
    const renderSizes = () => {
      const sizes = validSizes(selectedVariant);
      selectedSize = sizes[0]?.[0] || "";
      const holder = box.querySelector("#quickSizes");
      holder.innerHTML = sizes
        .map(
          ([size], i) =>
            `<button class="size-btn ${i === 0 ? "active" : ""}" data-qsize="${esc(size)}" type="button">${esc(size)}</button>`,
        )
        .join("");
      box.querySelector("#quickPrice").textContent = money(
        sizePrice(item, selectedVariant.id, selectedSize),
      );
      holder.querySelectorAll("[data-qsize]").forEach(
        (btn) =>
          (btn.onclick = () => {
            holder.querySelectorAll("[data-qsize]").forEach((x) => x.classList.remove("active"));
            btn.classList.add("active");
            selectedSize = btn.dataset.qsize;
            box.querySelector("#quickPrice").textContent = money(
              sizePrice(item, selectedVariant.id, selectedSize),
            );
          }),
      );
    };
    box.innerHTML = `<button class="quick-close" data-close-quick type="button" aria-label="Đóng xem nhanh">×</button><div class="quick-img"><img id="quickImage" src="${esc(selectedVariant.image)}" alt="${esc(item.name)}" onerror="this.src='assets/images/product-fallback.svg'"></div><div class="quick-info"><span class="eyebrow">${esc(item.brand)}</span><h2>${esc(item.name)}</h2>
      ${variantList.length > 1 ? `<div class="option-label compact"><span>Màu / phiên bản</span><span id="quickVariantName">${esc(selectedVariant.label)}</span></div><div class="variant-row compact" id="quickVariants">${variantList.map((v, i) => `<button class="variant-btn ${v.id === selectedVariant.id ? "active" : ""}" data-qvariant="${esc(v.id)}" type="button"><img src="${esc(v.image)}" alt=""><span>${esc(v.label)}</span></button>`).join("")}</div>` : ""}
      <div class="quick-price" id="quickPrice"></div><div class="option-label compact"><span>Size</span><span>Chọn size còn hàng</span></div><div class="size-row" id="quickSizes"></div><button class="btn dark full" id="quickAdd" type="button">Thêm vào giỏ</button><a class="text-arrow" href="${productUrl(item)}">Xem chi tiết sản phẩm →</a></div>`;
    renderSizes();
    box.querySelector("#quickAdd").disabled = !selectedSize || Number(selectedVariant.stock) <= 0;
    box.querySelectorAll("[data-qvariant]").forEach(
      (btn) =>
        (btn.onclick = () => {
          box.querySelectorAll("[data-qvariant]").forEach((x) => x.classList.remove("active"));
          btn.classList.add("active");
          selectedVariant = variant(item, btn.dataset.qvariant);
          box.querySelector("#quickVariantName").textContent = selectedVariant.label;
          box.querySelector("#quickImage").src = selectedVariant.image;
          renderSizes();
          box.querySelector("#quickAdd").disabled = !selectedSize || Number(selectedVariant.stock) <= 0;
        }),
    );
    box.querySelector("#quickAdd").onclick = () => {
      if (selectedSize) addCart(item.id, selectedVariant.id, selectedSize, 1);
      closeQuick();
    };
    document.getElementById("quickModal").inert = false;
    document.getElementById("quickModal")?.classList.add("open");
    document.body.classList.add("lock");
  }

  function closeQuick() {
    if (document.getElementById("quickModal")) document.getElementById("quickModal").inert = true;
    document.getElementById("quickModal")?.classList.remove("open");
    document.body.classList.remove("lock");
  }

  function saveRecent(id) {
    const productId = product(id)?.id ?? Number(id);
    let list = get(keys.recent);
    list = list.filter((itemId) => itemId !== productId);
    list.unshift(productId);
    set(keys.recent, list.slice(0, 8));
  }

  function recent() {
    return [...new Set(get(keys.recent).map(id=>product(id)?.id).filter(id=>id!=null))];
  }

  /**
   * Create an order.
   * Live mode: database returns authoritative totals.
   * Fallback mode: totals supplied by checkout are used locally.
   */
  async function createOrder(draft) {
    let order;

    if (window.PAUS_BACKEND?.getMode() === "supabase") {
      order = await window.PAUS_BACKEND.createOrder(draft);
      if (!order?.id) {
        throw new Error("Không thể tạo đơn hàng.");
      }
    } else {
      const id = `NHAP-${Date.now().toString().slice(-8)}`;
      order = {
        ...draft,
        id,
        order_code: id,
        createdAt: new Date().toISOString(),
        status: "Bản nháp trên thiết bị — chưa gửi", localOnly: true,
      };
    }

    const list = orders();
    list.unshift(order);
    try { set(keys.orders, list.slice(0, 30)); } catch (error) {
      if (order.localOnly) throw error;
      order.localHistorySaved = false;
    }
    return order;
  }

  async function copy(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to textarea method.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }

  async function zalo(orderText) {
    const copied = await copy(orderText).catch(() => false);
    toast(copied ? "Đã sao chép nội dung. Mở Zalo và dán để gửi cho PAUS." : "Chưa sao chép được. Vui lòng chọn nội dung và sao chép thủ công.");
    return copied;
  }

  return {
    money,
    esc,
    product,
    minPrice,
    variants,
    variant,
    sizePrice,
    variantImage,
    productUrl,
    card,
    brandMark,
    productDescription,
    cart,
    wishlist,
    orders,
    cartCount,
    cartSubtotal,
    addCart,
    updateCart,
    removeCart,
    clearCart,
    toggleWish,
    syncBadges,
    toast,
    renderShell,
    renderCartDrawer,
    saveRecent,
    recent,
    createOrder,
    zalo,
    copy,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body?.dataset?.admin) PAUS.renderShell();
});

document.addEventListener("paus:settings-ready",()=>{
  document.querySelectorAll("[data-contact-zalo]").forEach(link=>{link.href=`https://zalo.me/${encodeURIComponent(STORE_CONFIG.zaloPhone)}`;link.textContent=`Zalo / ${STORE_CONFIG.zaloPhone} ↗`;});
  document.querySelectorAll("[data-contact-phone]").forEach(link=>{link.href=`tel:${STORE_CONFIG.hotline}`;link.textContent=STORE_CONFIG.hotline;});
  document.querySelectorAll("[data-contact-email]").forEach(link=>{link.href=`mailto:${STORE_CONFIG.email}`;link.textContent=STORE_CONFIG.email;});
});
