PAUS_BOOT(async () => {
  const ui=window.PAUS_ADMIN_UI,model=window.PAUS_ADMIN_DATA;
  const pageState={products:1,orders:1,subscribers:1};
  let dataReady=false;
  let auth;
  document.getElementById("refreshAdmin").onclick=()=>location.reload();

  try {
    auth = await PAUS_ADMIN_API.requireAdmin();
  } catch (error) {
    console.error("PAUS admin auth boot failed:", error);
    const badge = document.getElementById("backendMode");
    if (badge) badge.textContent = "Lỗi kết nối";
    ui.error(
      "PAUS Admin không khởi tạo được Supabase. Kiểm tra Project URL, Publishable key và chạy supabase/schema.sql.\n\n" +
        (error?.message || error),
    );
    return;
  }

  if (!auth.ok) {
    if (["no-session", "not-admin"].includes(auth.reason)) {
      location.replace("/admin/login.html");
      return;
    }

    const badge = document.getElementById("backendMode");
    if (badge) {
      badge.textContent = "Lỗi Supabase";
      badge.classList.remove("live");
    }

    const notice = document.getElementById("demoNotice");
    if (notice) {
      notice.hidden = false;
      notice.innerHTML = `
        <strong>Không thể khởi tạo trang quản trị</strong><br>
        ${PAUS.esc(auth.error?.message || "Kiểm tra Supabase và chạy supabase/schema.sql.")}
      `;
    }
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];
  const esc = PAUS.esc;
  const money = PAUS.money;

  let products = [];
  let orders = [];
  let coupons = [];
  let subscribers = [];
  let editingProduct = null;
  let editingCoupon = null;
  let viewingOrder = null;

  $("#backendMode").textContent = auth.demo ? "Dùng thử trên máy" : "Đã kết nối";
  $("#backendMode").classList.toggle("live", !auth.demo);

  if (auth.demo) {
    $("#demoNotice").hidden = false;
    try { await PAUS_ADMIN_API.prepareDemo(); }
    catch(error) { ui.error(error); return; }
  }

  function toast(message) {
    const element = $("#adminToast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(element._timer);
    element._timer = setTimeout(() => element.classList.remove("show"), 2200);
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function setView(name) {
    if(!document.getElementById(`view-${name}`))name="dashboard";
    $$(".admin-nav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === name);
      if(button.dataset.view===name)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
    });

    $$(".admin-view").forEach((view) => {
      view.classList.toggle("active", view.id === `view-${name}`);
    });

    $("#pageTitle").textContent =
      $(".admin-nav button.active")?.dataset.title || "PAUS Admin";

    document.title=`${$("#pageTitle").textContent} — PAUS Admin`;
    history.replaceState(null,"",`#${name}`);
    ui.sidebarOpen(false);
  }

  $$(".admin-nav button").forEach((button) => {
    button.onclick = () => setView(button.dataset.view);
  });

  $("#menuAdmin").onclick = () => ui.sidebarOpen(!$("#sidebar").classList.contains("open"));
  $$("[data-jump-view]").forEach(button=>button.onclick=()=>setView(button.dataset.jumpView));
  $("#adminDate").textContent=new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  setView(location.hash.slice(1)||"dashboard");
  $("#logoutBtn").onclick = async event => {
    const button=event.currentTarget;button.disabled=true;
    try{await PAUS_ADMIN_API.signOut();location.href="/admin/login.html";}
    catch(error){ui.error(error);button.disabled=false;}
  };

  function revenueTotal() {
    return orders
      .filter((order) => ["Hoàn thành", "Đã giao"].includes(order.status))
      .reduce((total, order) => total + Number(order.total || 0), 0);
  }

  function renderStats() {
    $("#statProducts").textContent = products.filter(
      (product) => product.active !== false,
    ).length;
    $("#statFeatured").textContent = products.filter(
      (product) => product.featured && product.active !== false,
    ).length;
    $("#statOrders").textContent = orders.length;
    $("#statPending").textContent = orders.filter(order=>!order.localOnly&&(!order.status||order.status==="Chờ xác nhận")).length;
    $("#statRevenue").textContent = money(revenueTotal());
    $("#statSubscribers").textContent = subscribers.length;

    const recent = orders.slice(0, 6);
    $("#recentOrders").innerHTML = recent.length
      ? recent.map((order) => orderCard(order, true)).join("")
      : '<div class="empty-admin">Chưa có đơn hàng.</div>';

    const lowStock = products
      .filter((product) => {
        const stock = Number(product.stock || 0);
        return product.active !== false && stock > 0 && stock <= 5;
      })
      .slice(0, 8);

    $("#lowStock").innerHTML = lowStock.length
      ? lowStock
          .map(
            (product) => `
              <div class="stock-alert-row">
                <span>${esc(product.name)}</span>
                <b>${Number(product.stock)}</b>
              </div>
            `,
          )
          .join("")
      : '<div class="empty-admin">Không có cảnh báo tồn kho.</div>';
  }

  function productMinPrice(product) {
    const prices = (Array.isArray(product.variants) && product.variants.length ? product.variants : [{sizes: product.sizes || {}}])
      .flatMap((variant) => Object.values(variant.sizes || {}))
      .map((value) => Number(value && typeof value === "object" ? value.price : value))
      .filter((value) => Number.isFinite(value) && value > 0);

    return prices.length ? Math.min(...prices) : 0;
  }

  function productRow(product) {
    const min = productMinPrice(product);

    return `
      <tr>
        <td>
          <div class="product-cell">
            <img
              src="${esc(product.image || "../assets/images/product-fallback.svg")}"
              alt="${esc(product.name)}"
              onerror="this.src='../assets/images/product-fallback.svg'"
            >
            <div>
              <b>${esc(product.name)}</b>
              <small>${esc(product.brand)} · #${esc(product.id)}</small>
            </div>
          </div>
        </td>
        <td>${esc({Sneakers:"Giày & sneaker",Apparel:"Thời trang","Slides & Sandals":"Dép & sandals","Bags & Accessories":"Phụ kiện"}[product.category]||product.category)}</td>
        <td>${esc(product.collection)}</td>
        <td class="price-cell">${min ? money(min) : "—"}</td>
        <td>${Number(product.stock || 0)}</td>
        <td>
          <span class="pill ${product.active !== false ? "ok" : "danger"}">
            ${product.active !== false ? "Đang bán" : "Ẩn"}
          </span>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit-product="${product.id}" type="button">Sửa</button>
            <button class="icon-btn" data-delete-product="${product.id}" type="button">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }

  function paged(items,key,size=30){
    const info=model.page(items,pageState[key],size);pageState[key]=info.page;
    const prefix={products:"product",orders:"order",subscribers:"subscriber"}[key];
    $(`#${prefix}PageInfo`).textContent=info.total?`Đang xem ${info.start}–${info.end} / ${info.total.toLocaleString("vi-VN")}`:"Không có kết quả";
    const nav=$(`#${prefix}Pagination`);
    if(info.pages===1){nav.innerHTML="";return info.items;}
    const numbers=[...new Set([1,info.page-1,info.page,info.page+1,info.pages])].filter(n=>n>0&&n<=info.pages).sort((a,b)=>a-b);
    let html=`<button type="button" data-admin-page="${info.page-1}" ${info.page===1?"disabled":""} aria-label="Trang trước">← Trước</button>`;
    numbers.forEach((n,i)=>{if(i&&n-numbers[i-1]>1)html+='<span aria-hidden="true">…</span>';html+=`<button type="button" data-admin-page="${n}" ${n===info.page?'aria-current="page"':""} aria-label="Trang ${n}">${n}</button>`;});
    nav.innerHTML=html+`<button type="button" data-admin-page="${info.page+1}" ${info.page===info.pages?"disabled":""} aria-label="Trang tiếp theo">Sau →</button>`;
    nav.onclick=event=>{const button=event.target.closest("[data-admin-page]");if(!button||button.disabled)return;pageState[key]=Number(button.dataset.adminPage);({products:renderProducts,orders:renderOrders,subscribers:renderSubscribers})[key]();};
    return info.items;
  }

  function renderProducts() {
    const filtered=model.filterProducts(products,{query:$("#productSearch").value,status:$("#productStatus").value,category:$("#productCategory").value});
    const visible=paged(filtered,"products");
    $("#productsBody").innerHTML=visible.length?visible.map(productRow).join(""):'<tr><td colspan="7"><div class="empty-admin">Không có sản phẩm phù hợp.<small>Thử từ khóa khác hoặc thay đổi bộ lọc.</small></div></td></tr>';
    $("#productCountAdmin").textContent=`${filtered.length.toLocaleString("vi-VN")} / ${products.length.toLocaleString("vi-VN")} sản phẩm`;
  }

  function setFormValue(form, name, value) {
    const element = form.elements[name];
    if (!element) return;

    if (element.type === "checkbox") {
      element.checked = Boolean(value);
    } else {
      element.value = value ?? "";
    }
  }

  function syncVariantTextarea() {
    const form = $("#productForm");
    const textarea = form?.elements?.variants;
    if (!textarea || !window.__PAUS_ADMIN_VARIANTS) return;

    let variants;
    try{variants=window.__PAUS_ADMIN_VARIANTS.collect(form.elements.image.value.trim());}catch{return;}
    textarea.value=variants.map(variant=>`${variant.label} | ${Object.entries(variant.sizes).map(([size,value])=>`${size}=${Number(value&&typeof value==="object"?value.price:value)}`).join(",")} | ${variant.image||""} | stock=${variant.stock}`).join("\n");
    form.elements.stock.value=variants.reduce((sum,v)=>sum+Number(v.stock||0),0);
  }

  function createVariantBuilder() {
    const builder = $("#variantBuilder");
    const addVariantButton = $("#addVariantBtn");
    const countElement = $("#variantCount");
    if (!builder || !addVariantButton) return;

    const previewFallback = "../assets/images/product-fallback.svg";

    function normalizeVariant(raw = {}) {
      const sizeEntries = Object.entries(raw.sizes || {})
        .map(([size, value]) => ({
          size,
          price:
            typeof value === "object"
              ? Number(value.price || 0)
              : Number(value || 0),
        }))
        .filter((entry) => entry.size && entry.price > 0);

      return {
        id: raw.id || "",
        label: raw.label || "",
        gallery: Array.isArray(raw.gallery)?raw.gallery:[],
        original: raw,
        image: raw.image || "",
        stock: Number(raw.stock || 0),
        sizes: sizeEntries.length
          ? sizeEntries
          : [{ size: "", price: "" }],
      };
    }

    function formatPriceInput(input) {
      const number = Number(String(input.value || "").replace(/[^0-9]/g, ""));
      if (!number) return;
      input.value = number.toLocaleString("vi-VN");
    }

    function rawPrice(value) {
      return Number(String(value || "").replace(/[^0-9]/g, ""));
    }

    function updateBuilderCount() {
      const cards = [...builder.querySelectorAll(".variant-card")];
      if (countElement) {
        countElement.textContent = `${cards.length} màu / phiên bản`;
      }
      cards.forEach((card, index) => {
        card.dataset.variantIndex = String(index);
        const order = card.querySelector("[data-variant-order]");
        if (order) order.textContent = String(index + 1).padStart(2, "0");
      });
    }

    function updateVariantSummary(card) {
      const label =
        card.querySelector("[data-variant-label]")?.value.trim() ||
        "Chưa đặt tên";
      const totalSizes = card.querySelectorAll(".variant-size-row").length;
      const stock = Number(
        card.querySelector("[data-variant-stock]")?.value || 0,
      );
      const title = card.querySelector("[data-variant-title]");
      const meta = card.querySelector("[data-variant-meta]");

      if (title) title.textContent = label;
      if (meta) {
        meta.innerHTML = `
          <span>${totalSizes} size</span>
          <span>Tồn ${stock}</span>
        `;
      }
    }

    function createSizeRow(data = {}) {
      const row = document.createElement("div");
      row.className = "variant-size-row";
      row.innerHTML = `
        <input class="variant-size-input" data-size-name aria-label="Size" placeholder="VD: 230, 38, M, XL" value="${esc(data.size || "")}" />
        <div class="money-input-wrap">
          <input class="variant-price-input" data-size-price aria-label="Giá bán" inputmode="numeric" placeholder="1.690.000" value="${data.price ? Number(data.price).toLocaleString("vi-VN") : ""}" />
          <span>₫</span>
        </div>
        <button class="variant-icon-btn danger" data-remove-size type="button" title="Xóa size" aria-label="Xóa size">×</button>
      `;

      const priceInput = row.querySelector("[data-size-price]");
      priceInput.addEventListener("blur", () => formatPriceInput(priceInput));

      row.querySelector("[data-remove-size]").onclick = () => {
        const list = row.parentElement;
        const card = row.closest(".variant-card");
        row.remove();
        if (!list.querySelector(".variant-size-row")) {
          list.appendChild(createSizeRow());
        }
        if (card) updateVariantSummary(card);
        syncVariantTextarea();
      };

      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          const card = row.closest(".variant-card");
          if (card) updateVariantSummary(card);
          syncVariantTextarea();
        });
      });

      return row;
    }

    function readCard(card, index = 0, primaryImage = "") {
      const label =
        card.querySelector("[data-variant-label]")?.value.trim() ||
        `Phiên bản ${index + 1}`;
      const image =
        card.querySelector("[data-variant-image]")?.value.trim() ||
        primaryImage ||
        "";
      const stock = Number(
        card.querySelector("[data-variant-stock]")?.value || 0,
      );
      const rows=[...card.querySelectorAll(".variant-size-row")].map(row=>({size:row.querySelector("[data-size-name]")?.value.trim(),price:row.querySelector("[data-size-price]")?.value})).filter(row=>row.size&&Number(String(row.price).replace(/[^0-9]/g,""))>0);
      const gallery=(card.querySelector("[data-variant-gallery]")?.value||"").split(/\n/).map(value=>value.trim()).filter(Boolean);
      return model.variant(card._originalVariant||{},{label,image,stock,rows,gallery});
    }

    async function uploadVariantImage(card, fileInput) {
      const file = fileInput.files?.[0];
      if (!file) return;

      const status = card.querySelector("[data-upload-status]");
      const imageInput = card.querySelector("[data-variant-image]");
      const preview = card.querySelector("[data-variant-preview]");

      if (auth.demo) {
        toast("Upload ảnh màu cần Supabase live.");
        fileInput.value = "";
        return;
      }

      try {
        card.classList.add("uploading");
        if (status) status.textContent = "Đang tải ảnh…";
        const url = await PAUS_ADMIN_API.uploadProductImage(file);
        imageInput.value = url;
        preview.src = url;
        if (status) status.textContent = "Đã tải ảnh";
        syncVariantTextarea();
        toast("Đã upload ảnh cho màu / phiên bản");
      } catch (error) {
        if (status) status.textContent = "Upload thất bại";
        ui.error(error.message || error);
      } finally {
        card.classList.remove("uploading");
        fileInput.value = "";
      }
    }

    function createVariantCard(data = {}) {
      const variant = normalizeVariant(data);
      const card = document.createElement("section");
      card.className = "variant-card";
      card._originalVariant=variant.original;
      card.innerHTML = `
        <div class="variant-card-head">
          <div class="variant-heading">
            <span class="variant-order" data-variant-order>01</span>
            <div>
              <h4 data-variant-title>${esc(variant.label || "Chưa đặt tên")}</h4>
              <div class="variant-meta" data-variant-meta></div>
            </div>
          </div>
          <div class="variant-card-actions">
            <button class="variant-action-btn" data-duplicate-variant type="button">Nhân bản</button>
            <button class="variant-action-btn danger" data-remove-variant type="button">Xóa</button>
          </div>
        </div>

        <div class="variant-editor-grid">
          <div class="variant-image-panel">
            <img class="variant-image-preview" data-variant-preview src="${esc(variant.image || previewFallback)}" alt="Ảnh màu / phiên bản" />
            <label class="variant-upload-btn">
              <input accept="image/jpeg,image/png,image/webp,image/avif" data-variant-file type="file" />
              <span>↑ Chọn ảnh từ máy</span>
            </label>
            <small data-upload-status>JPG, PNG, WEBP, AVIF · tối đa 5MB</small>
          </div>

          <div class="variant-fields-panel">
            <div class="variant-form-grid">
              <div class="field">
                <label>Tên màu / phiên bản *</label>
                <input data-variant-label placeholder="VD: Trắng, Đen, Bạc, Navy" value="${esc(variant.label)}" />
              </div>
              <div class="field">
                <label>Tồn kho của màu</label>
                <input data-variant-stock inputmode="numeric" min="0" placeholder="0" type="number" value="${esc(variant.stock || 0)}" />
              </div>
              <div class="field full">
                <label>URL ảnh màu</label>
                <input data-variant-image placeholder="Tự điền sau khi upload hoặc dán URL ảnh" value="${esc(variant.image)}" />
              </div>
              <div class="field full"><label>Ảnh bổ sung cho màu</label><textarea data-variant-gallery placeholder="Mỗi dòng một đường dẫn ảnh">${esc(variant.gallery.join("\n"))}</textarea></div>
            </div>
          </div>
        </div>

        <div class="variant-pricing-panel">
          <div class="variant-pricing-toolbar">
            <div>
              <b>Size & giá bán</b>
              <small>Size hiển thị trên shop sẽ chỉ thuộc màu này.</small>
            </div>
            <div class="variant-bulk-price">
              <div class="money-input-wrap compact">
                <input data-bulk-price inputmode="numeric" placeholder="Giá chung" />
                <span>₫</span>
              </div>
              <button class="variant-action-btn" data-apply-price type="button">Áp dụng tất cả</button>
              <button class="variant-action-btn primary" data-add-size type="button">+ Thêm size</button>
            </div>
          </div>
          <div class="variant-size-table-head">
            <span>Size</span>
            <span>Giá bán</span>
            <span></span>
          </div>
          <div class="variant-size-list"></div>
        </div>
      `;

      const title = card.querySelector("[data-variant-title]");
      const labelInput = card.querySelector("[data-variant-label]");
      const stockInput = card.querySelector("[data-variant-stock]");
      const imageInput = card.querySelector("[data-variant-image]");
      const preview = card.querySelector("[data-variant-preview]");
      const fileInput = card.querySelector("[data-variant-file]");
      const sizeList = card.querySelector(".variant-size-list");
      const bulkPrice = card.querySelector("[data-bulk-price]");
      bulkPrice.setAttribute("aria-label","Giá chung cho các size");
      card.querySelector("[data-variant-gallery]").addEventListener("input",syncVariantTextarea);

      variant.sizes.forEach((entry) => sizeList.appendChild(createSizeRow(entry)));

      labelInput.addEventListener("input", () => {
        title.textContent = labelInput.value.trim() || "Chưa đặt tên";
        updateVariantSummary(card);
        syncVariantTextarea();
      });

      stockInput.addEventListener("input", () => {
        updateVariantSummary(card);
        syncVariantTextarea();
      });

      imageInput.addEventListener("input", () => {
        preview.src = imageInput.value.trim() || previewFallback;
        syncVariantTextarea();
      });

      preview.addEventListener("error", () => {
        preview.src = previewFallback;
      });

      fileInput.addEventListener("change", () => uploadVariantImage(card, fileInput));

      bulkPrice.addEventListener("blur", () => formatPriceInput(bulkPrice));

      card.querySelector("[data-apply-price]").onclick = () => {
        const price = rawPrice(bulkPrice.value);
        if (!price) {
          toast("Nhập giá chung trước khi áp dụng.");
          bulkPrice.focus();
          return;
        }
        card.querySelectorAll("[data-size-price]").forEach((input) => {
          input.value = price.toLocaleString("vi-VN");
        });
        syncVariantTextarea();
        toast("Đã áp dụng giá cho toàn bộ size của màu này");
      };

      card.querySelector("[data-add-size]").onclick = () => {
        sizeList.appendChild(createSizeRow());
        updateVariantSummary(card);
        syncVariantTextarea();
        sizeList.lastElementChild?.querySelector("[data-size-name]")?.focus();
      };

      card.querySelector("[data-duplicate-variant]").onclick = () => {
        const cards = [...builder.querySelectorAll(".variant-card")];
        const currentIndex = cards.indexOf(card);
        const copy = readCard(card, Math.max(currentIndex, 0));
        copy.id = "";
        copy.label = copy.label ? `${copy.label} - bản sao` : "Bản sao";
        builder.insertBefore(createVariantCard(copy), card.nextSibling);
        updateBuilderCount();
        syncVariantTextarea();
      };

      card.querySelector("[data-remove-variant]").onclick = () => {
        const cards = builder.querySelectorAll(".variant-card");
        if (cards.length <= 1) {
          toast("Sản phẩm cần ít nhất 1 màu / phiên bản.");
          return;
        }
        card.remove();
        updateBuilderCount();
        syncVariantTextarea();
      };

      updateVariantSummary(card);
      return card;
    }

    function renderVariants(list = []) {
      builder.innerHTML = "";
      const source = Array.isArray(list) && list.length ? list : [{}];
      source.forEach((entry) => builder.appendChild(createVariantCard(entry)));
      updateBuilderCount();
      syncVariantTextarea();
    }

    function collectVariants(primaryImage = "") {
      const seen = new Map();
      return [...builder.querySelectorAll(".variant-card")]
        .map((card, index) => readCard(card, index, primaryImage))
        .filter((variant) => Object.keys(variant.sizes || {}).length > 0)
        .map((variant) => {
          const baseId = variant.id || "variant";
          const count = (seen.get(baseId) || 0) + 1;
          seen.set(baseId, count);
          return {
            ...variant,
            id: count === 1 ? baseId : `${baseId}-${count}`,
          };
        });
    }

    addVariantButton.onclick = () => {
      const card = createVariantCard();
      builder.appendChild(card);
      updateBuilderCount();
      syncVariantTextarea();
      card.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth", block: "center" });
      card.querySelector("[data-variant-label]")?.focus();
    };

    window.__PAUS_ADMIN_VARIANTS = {
      render: renderVariants,
      collect: collectVariants,
      sync: syncVariantTextarea,
    };

    renderVariants();
  }

  createVariantBuilder();
  function openProduct(product = null) {
    editingProduct = product;

    const form = $("#productForm");
    form.reset();
    form.elements.slug.dataset.touched = "";
    $("#imageUpload").value = "";
    $("#galleryUpload").value = "";
    $("#productModalTitle").textContent = product
      ? "Sửa sản phẩm"
      : "Thêm sản phẩm";

    const values = product || {
      category: "Sneakers",
      collection: "MLB Footwear",
      rating: 0,
      reviews: 0,
      stock: 0,
      active: true,
      featured: false,
      sort_order: products.length,
      sizes: {},
    };

    [
      "brand",
      "name",
      "slug",
      "category",
      "collection",
      "badge",
      "rating",
      "reviews",
      "short",
      "description",
      "material",
      "fit",
      "origin",
      "style",
      "image",
      "stock",
      "sort_order",
    ].forEach((key) => {
      const input=form.elements[key];
      if(input?.tagName==="SELECT"&&values[key]&&![...input.options].some(option=>option.value===values[key])){const option=document.createElement("option");option.value=values[key];option.textContent=values[key];input.append(option);}
      setFormValue(form,key,values[key]);
    });

    setFormValue(form, "features", (values.features || []).join(", "));
    setFormValue(form, "gallery", (values.gallery || []).join("\n"));
    setFormValue(form, "featured", values.featured);
    setFormValue(form, "active", values.active !== false);
    const initialVariants = Array.isArray(values.variants) && values.variants.length
      ? values.variants
      : [{ id: "default", label: "", sizes: values.sizes || {}, image: values.image || "", stock: values.stock || 0 }];

    window.__PAUS_ADMIN_VARIANTS?.render(initialVariants);

    $("#productPreview").src =
      values.image || "../assets/images/product-fallback.svg";
    window.__PAUS_ADMIN_VARIANTS?.sync();
    $("#productModal").classList.add("open");
  }

  function closeProduct() {
    $("#productModal").classList.remove("open");
  }

  $("#addProductBtn").onclick = () => openProduct();
  $("#closeProductModal").onclick = closeProduct;
  $("#cancelProduct").onclick = closeProduct;
  $("#dashboardAddProduct").onclick = () => openProduct();
  $("#productSearch").oninput=()=>{pageState.products=1;renderProducts();};
  ["#productStatus","#productCategory"].forEach(id=>$(id).onchange=()=>{pageState.products=1;renderProducts();});

  $("#productForm").elements.name.addEventListener("input", (event) => {
    const slugInput = $("#productForm").elements.slug;
    if (!editingProduct && !slugInput.dataset.touched) {
      slugInput.value = slugify(event.target.value);
    }
  });

  $("#productForm").elements.slug.addEventListener("input", (event) => {
    event.target.dataset.touched = "1";
  });

  $("#productForm").elements.image.addEventListener("input", (event) => {
    $("#productPreview").src =
      event.target.value || "../assets/images/product-fallback.svg";
  });

  $("#imageUpload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (auth.demo) {
      toast("Demo local không upload file. Hãy dùng URL ảnh hoặc kết nối Supabase.");
      return;
    }

    try {
      toast("Đang upload ảnh chính…");
      const url = await PAUS_ADMIN_API.uploadProductImage(file);
      $("#productForm").elements.image.value = url;
      $("#productPreview").src = url;
      toast("Upload ảnh chính thành công");
    } catch (error) {
      ui.error(error.message || error);
    } finally {
      event.target.value = "";
    }
  });

  $("#galleryUpload").addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;

    if (auth.demo) {
      toast("Upload gallery cần Supabase live.");
      return;
    }

    try {
      toast(`Đang upload ${files.length} ảnh gallery…`);
      const urls = await PAUS_ADMIN_API.uploadProductImages(files);
      const textarea = $("#productForm").elements.gallery;
      const current = textarea.value
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean);
      textarea.value = [...current, ...urls].join("\n");
      toast("Đã thêm ảnh vào gallery");
    } catch (error) {
      ui.error(error.message || error);
    } finally {
      event.target.value = "";
    }
  });

  $("#productForm").onsubmit = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    if($("#saveProduct").disabled)return;
    if(!ui.validateVariants($("#variantBuilder")))return;
    const formData = new FormData(form);
    const primaryImage = String(formData.get("image") || "").trim();
    const variants = window.__PAUS_ADMIN_VARIANTS
      ? window.__PAUS_ADMIN_VARIANTS.collect(primaryImage)
      : [];
    if (!variants.length) {
      ui.error("Hãy thêm ít nhất một màu / phiên bản và nhập tối thiểu 1 size + giá cho màu đó.");
      return;
    }
    const sizes = variants[0].sizes;
    window.__PAUS_ADMIN_VARIANTS?.sync();

    const product = {
      id: editingProduct?.id,
      brand: formData.get("brand").trim(),
      name: formData.get("name").trim(),
      slug: slugify(formData.get("slug") || formData.get("name")),
      category: formData.get("category"),
      collection: formData.get("collection"),
      badge: formData.get("badge").trim(),
      featured: formData.get("featured") === "on",
      active: formData.get("active") === "on",
      rating: Number(formData.get("rating") || 0),
      reviews: Number(formData.get("reviews") || 0),
      features: formData
        .get("features")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      short: formData.get("short").trim(),
      description: formData.get("description").trim(),
      material: formData.get("material").trim(),
      fit: formData.get("fit").trim(),
      origin: formData.get("origin").trim(),
      style: formData.get("style").trim(),
      image: primaryImage || variants[0]?.image || "",
      gallery: (() => {
        const manual = formData
          .get("gallery")
          .split(/\n|,/)
          .map((value) => value.trim())
          .filter(Boolean);
        return manual.length
          ? manual
          : [...new Set(variants.map((variant) => variant.image).filter(Boolean))];
      })(),
      sizes,
      variants,
      stock: variants.reduce((sum,v)=>sum+Number(v.stock||0),0),
      sort_order: Number(formData.get("sort_order") || 0),
    };

    if (!product.slug) {
      ui.error("Slug sản phẩm không hợp lệ.");
      return;
    }

    const button = $("#saveProduct");
    button.disabled = true;
    button.textContent = "Đang lưu…";

    try {
      const saved=await PAUS_ADMIN_API.saveProduct(product);
      const index=products.findIndex(p=>String(p.id)===String(saved.id));
      if(index>=0)products[index]=saved;else products.unshift(saved);
      renderProducts();
      renderStats();
      closeProduct();
      toast("Đã lưu sản phẩm");
    } catch (error) {
      ui.error(error.message || error);
    } finally {
      button.disabled = false;
      button.textContent = "Lưu sản phẩm";
    }
  };

  $("#productsBody").onclick = async (event) => {
    const edit = event.target.closest("[data-edit-product]");
    const remove = event.target.closest("[data-delete-product]");

    if (edit) {
      openProduct(
        products.find((product) => String(product.id) === edit.dataset.editProduct),
      );
      return;
    }

    if (!remove) return;

    const product = products.find(
      (item) => String(item.id) === remove.dataset.deleteProduct,
    );

    if (!confirm(`Xóa vĩnh viễn “${product?.name}”?\n\nNếu chỉ tạm ngừng bán, nên bấm Sửa và tắt “Hiển thị trên shop”.`)) {
      return;
    }

    try {
      await PAUS_ADMIN_API.deleteProduct(remove.dataset.deleteProduct);
      products=products.filter(p=>String(p.id)!==String(remove.dataset.deleteProduct));
      renderProducts();
      renderStats();
      toast("Đã xóa sản phẩm");
    } catch (error) {
      ui.error(error.message || error);
    }
  };

  function orderCode(order) {
    return order.order_code || order.id || "—";
  }

  function orderDate(order) {
    return order.created_at || order.createdAt || null;
  }

  function orderCard(order, compact = false) {
    const customer = order.customer || {};
    const items = order.items || [];
    const id = order.id;
    const date = orderDate(order);

    return `
      <article class="order-card-admin">
        <div class="top">
          <div>
            <h4>${esc(orderCode(order))}</h4>
            <small>${date ? new Date(date).toLocaleString("vi-VN") : ""}</small>
          </div>
          <b>${money(order.total)}</b>
        </div>

        ${
          compact
            ? ""
            : `
              <div class="meta">
                <div><span>Khách hàng</span><b>${esc(customer.name || "—")}</b></div>
                <div><span>Điện thoại</span><b>${esc(customer.phone || "—")}</b></div>
                <div><span>Sản phẩm</span><b>${items.length} dòng</b></div>
                <div><span>Thanh toán</span><b>${esc(order.payment || customer.payment || "—")}</b></div>
              </div>
            `
        }

        <div class="order-card-actions">
          <span class="pill">${esc(order.status || "Chờ xác nhận")}</span>
          <div class="row-actions">
            <button class="icon-btn" data-order-view="${esc(id)}" type="button">Xem chi tiết</button>
            ${
              compact
                ? ""
                : `
                  <select class="status-select" aria-label="Trạng thái đơn ${esc(orderCode(order))}" data-order-status="${esc(id)}">
                    <option>Chờ xác nhận</option>
                    <option>Đã xác nhận</option>
                    <option>Đang chuẩn bị</option>
                    <option>Đang giao</option>
                    <option>Đã giao</option>
                    <option>Hoàn thành</option>
                    <option>Đã hủy</option>
                  </select>
                `
            }
          </div>
        </div>
      </article>
    `;
  }

  function bindOrderStatusSelectors() {
    $$("[data-order-status]").forEach((select) => {
      const order = orders.find(
        (item) => String(item.id) === select.dataset.orderStatus,
      );

      if (!order) return;
      select.value = order.status || "Chờ xác nhận";

      select.onchange = async () => {
        const previous = order.status;
        select.disabled = true;

        try {
          await PAUS_ADMIN_API.updateOrderStatus(
            select.dataset.orderStatus,
            select.value,
          );
          order.status = select.value;
          renderStats();
          renderOrders();
          toast("Đã cập nhật trạng thái đơn");
        } catch (error) {
          order.status = previous;
          select.value = previous;
          ui.error(error.message || error);
        } finally {
          select.disabled = false;
        }
      };
    });
  }

  function renderOrders() {
    const query = model.normalize($("#orderSearch").value.trim());
    const status = $("#orderStatus").value;

    const filtered = orders.filter((order) => {
      const customer = order.customer || {};
      const haystack = [
        order.order_code,
        order.id,
        customer.name,
        customer.phone,
        customer.email,
      ]
        .join(" ");

      return (
        (!query || model.normalize(haystack).includes(query)) &&
        (status === "all" || order.status === status)
      );
    });

    $("#ordersAdmin").innerHTML = filtered.length
      ? paged(filtered,"orders",15).map((order) => orderCard(order)).join("")
      : '<div class="empty-admin">Không có đơn hàng phù hợp.</div>';

    if(!filtered.length)paged([],"orders",15);
    $("#orderCountAdmin").textContent=`${filtered.length.toLocaleString("vi-VN")} / ${orders.length.toLocaleString("vi-VN")} đơn hàng`;
    bindOrderStatusSelectors();
  }

  function orderText(order) {
    const customer = order.customer || {};
    const items = order.items || [];

    let text = `PAUS — ĐƠN HÀNG ${orderCode(order)}\n\n`;
    text += "KHÁCH HÀNG\n";
    text += `${customer.name || ""}\n`;
    text += `${customer.phone || ""}\n`;
    text += `${customer.address || ""}, ${customer.city || ""}\n`;
    if (customer.email) text += `${customer.email}\n`;
    text += "\nSẢN PHẨM\n";

    items.forEach((item, index) => {
      text += `${index + 1}. ${item.name || "Sản phẩm"} · ${item.variantLabel || "Mặc định"} · Size ${item.size || ""} × ${item.qty || 1} = ${money(item.line || 0)}\n`;
    });

    text += `\nTạm tính: ${money(order.subtotal)}\n`;
    text += `Giảm giá: ${money(order.discount)}\n`;
    text += `Vận chuyển: ${Number(order.shipping || 0) ? money(order.shipping) : "Miễn phí"}\n`;
    text += `TỔNG: ${money(order.total)}\n`;
    text += `Trạng thái: ${order.status || "Chờ xác nhận"}\n`;

    if (customer.note || order.note) {
      text += `\nGhi chú: ${customer.note || order.note}\n`;
    }

    return text;
  }

  function openOrder(order) {
    viewingOrder = order;
    const customer = order.customer || {};
    const items = order.items || [];
    const date = orderDate(order);

    $("#orderModalTitle").textContent = orderCode(order);
    $("#orderModalBody").innerHTML = `
      <div class="order-detail-grid">
        <section class="order-detail-card">
          <small>KHÁCH HÀNG</small>
          <h4>${esc(customer.name || "—")}</h4>
          <p>${esc(customer.phone || "—")}</p>
          ${customer.email ? `<p>${esc(customer.email)}</p>` : ""}
          <p>${esc([customer.address, customer.city].filter(Boolean).join(", ") || "—")}</p>
        </section>
        <section class="order-detail-card">
          <small>ĐƠN HÀNG</small>
          <h4>${date ? new Date(date).toLocaleString("vi-VN") : "—"}</h4>
          <p>Thanh toán: ${esc(order.payment || customer.payment || "—")}</p>
          <p>Coupon: ${esc(order.coupon || "Không")}</p>
          <p>Trạng thái: <b>${esc(order.status || "Chờ xác nhận")}</b></p>
        </section>
      </div>

      <div class="order-lines-detail">
        ${items
          .map(
            (item) => `
              <div class="order-line-detail">
                <div>
                  <b>${esc(item.name || "Sản phẩm")}</b>
                  <small>${esc(item.brand || "")} · ${esc(item.variantLabel || "Mặc định")} · Size ${esc(item.size || "")} × ${Number(item.qty || 1)}</small>
                </div>
                <span>${money(item.line || 0)}</span>
              </div>
            `,
          )
          .join("")}
      </div>

      <div class="order-totals-detail">
        <div><span>Tạm tính</span><b>${money(order.subtotal)}</b></div>
        <div><span>Giảm giá</span><b>− ${money(order.discount)}</b></div>
        <div><span>Vận chuyển</span><b>${Number(order.shipping || 0) ? money(order.shipping) : "Miễn phí"}</b></div>
        <div class="grand"><span>Tổng</span><b>${money(order.total)}</b></div>
      </div>

      ${
        customer.note || order.note
          ? `<div class="order-note-detail"><b>Ghi chú</b><p>${esc(customer.note || order.note)}</p></div>`
          : ""
      }
    `;

    $("#orderZaloBtn").href = customer.phone
      ? `https://zalo.me/${encodeURIComponent(customer.phone)}`
      : `https://zalo.me/${encodeURIComponent(STORE_CONFIG.zaloPhone)}`;
    $("#orderModal").classList.add("open");
  }

  function closeOrder() {
    $("#orderModal").classList.remove("open");
    viewingOrder = null;
  }

  $("#orderSearch").oninput=()=>{pageState.orders=1;renderOrders();};
  $("#orderStatus").onchange=()=>{pageState.orders=1;renderOrders();};
  $("#closeOrderModal").onclick = closeOrder;
  $("#closeOrderBottom").onclick = closeOrder;

  $("#copyOrderBtn").onclick = async () => {
    if (!viewingOrder) return;
    const copied=await PAUS.copy(orderText(viewingOrder)).catch(()=>false);
    toast(copied?"Đã sao chép nội dung đơn":"Chưa sao chép được. Vui lòng thử lại.");
  };

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-order-view]");
    if (!viewButton) return;

    const order = orders.find(
      (item) => String(item.id) === viewButton.dataset.orderView,
    );
    if (order) openOrder(order);
  });

  function renderCoupons() {
    $("#couponsBody").innerHTML = coupons.length
      ? coupons
          .map((coupon) => {
            const value =
              coupon.type === "percent"
                ? `${coupon.value}%`
                : coupon.type === "shipping"
                  ? "Freeship"
                  : money(coupon.value);

            return `
              <tr>
                <td><b>${esc(coupon.code)}</b></td>
                <td>${value}</td>
                <td>${esc(coupon.label || "")}</td>
                <td>
                  <span class="pill ${coupon.active !== false ? "ok" : "danger"}">
                    ${coupon.active !== false ? "Bật" : "Tắt"}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button class="icon-btn" data-edit-coupon="${coupon.id}" type="button">Sửa</button>
                    <button
                      class="icon-btn"
                      data-delete-coupon="${coupon.id}"
                      data-code="${esc(coupon.code)}"
                      type="button"
                    >Xóa</button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="5"><div class="empty-admin">Chưa có mã giảm giá.</div></td>
        </tr>
      `;
  }

  function openCoupon(coupon = null) {
    editingCoupon = coupon;
    const form = $("#couponForm");
    form.reset();
    $("#couponModalTitle").textContent = coupon
      ? "Sửa mã giảm giá"
      : "Tạo mã giảm giá";

    if (coupon) {
      form.elements.code.value = coupon.code;
      form.elements.type.value = coupon.type;
      form.elements.value.value = coupon.value;
      form.elements.label.value = coupon.label || "";
      form.elements.active.checked = coupon.active !== false;
    } else {
      form.elements.active.checked = true;
    }

    $("#couponModal").classList.add("open");
  }

  function closeCoupon() {
    $("#couponModal").classList.remove("open");
  }

  $("#addCouponBtn").onclick = () => openCoupon();
  $("#closeCouponModal").onclick = closeCoupon;
  $("#cancelCoupon").onclick = closeCoupon;

  $("#couponForm").onsubmit = async (event) => {
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector("button[type=submit]");
    if(button.disabled)return;
    const formData = new FormData(form);
    const type=formData.get("type"),value=Number(formData.get("value")||0);
    if(type!=="shipping"&&(value<=0||(type==="percent"&&value>100))){ui.error("Giá trị ưu đãi phải lớn hơn 0; phần trăm không vượt quá 100.");return;}
    button.disabled=true;button.textContent="Đang lưu…";
    try {
      await PAUS_ADMIN_API.saveCoupon({
        id: editingCoupon?.id,
        code: formData.get("code"),
        type: formData.get("type"),
        value:
          formData.get("type") === "shipping"
            ? 0
            : Number(formData.get("value") || 0),
        label: formData.get("label"),
        active: formData.get("active") === "on",
      });

      coupons = await PAUS_ADMIN_API.listCoupons();
      renderCoupons();
      closeCoupon();
      toast("Đã lưu mã giảm giá");
    } catch (error) {
      ui.error(error.message || error);
    } finally {button.disabled=false;button.textContent="Lưu mã";}
  };

  $("#couponsBody").onclick = async (event) => {
    const edit = event.target.closest("[data-edit-coupon]");
    const remove = event.target.closest("[data-delete-coupon]");

    if (edit) {
      openCoupon(
        coupons.find((coupon) => String(coupon.id) === edit.dataset.editCoupon),
      );
      return;
    }

    if (!remove || !confirm(`Xóa mã ${remove.dataset.code}?`)) return;

    try {
      await PAUS_ADMIN_API.deleteCoupon(
        remove.dataset.deleteCoupon,
        remove.dataset.code,
      );
      coupons = await PAUS_ADMIN_API.listCoupons();
      renderCoupons();
      toast("Đã xóa mã");
    } catch (error) {
      ui.error(error.message || error);
    }
  };

  function renderSubscribers() {
    const filtered=subscribers.filter(item=>model.normalize(item.email).includes(model.normalize($("#subscriberSearch").value.trim())));
    const visible=paged(filtered,"subscribers");
    $("#subscriberCountAdmin").textContent=`${filtered.length.toLocaleString("vi-VN")} / ${subscribers.length.toLocaleString("vi-VN")} email`;
    $("#subscribersBody").innerHTML = visible.length
      ? visible
          .map(
            (subscriber) => `
              <tr>
                <td><b>${esc(subscriber.email)}</b></td>
                <td>${subscriber.created_at ? new Date(subscriber.created_at).toLocaleString("vi-VN") : "—"}</td>
                <td>
                  <span class="pill ${subscriber.active !== false ? "ok" : "danger"}">
                    ${subscriber.active !== false ? "Đang nhận" : "Tắt"}
                  </span>
                </td>
                <td>
                  <button class="icon-btn" data-delete-subscriber="${subscriber.id}" type="button">Xóa</button>
                </td>
              </tr>
            `,
          )
          .join("")
      : `
        <tr>
          <td colspan="4">
            <div class="empty-admin">
              ${auth.demo ? "Bản dùng thử chưa có email đăng ký." : "Chưa có email đăng ký."}
            </div>
          </td>
        </tr>
      `;
  }

  $("#subscriberSearch").oninput=()=>{pageState.subscribers=1;renderSubscribers();};

  $("#subscribersBody").onclick = async (event) => {
    const remove = event.target.closest("[data-delete-subscriber]");
    if (!remove || !confirm("Xóa email này khỏi danh sách?")) return;

    try {
      await PAUS_ADMIN_API.deleteSubscriber(remove.dataset.deleteSubscriber);
      subscribers = await PAUS_ADMIN_API.listSubscribers();
      renderSubscribers();
      renderStats();
      toast("Đã xóa email");
    } catch (error) {
      ui.error(error.message || error);
    }
  };

  function fillSettings(settings) {
    const form = $("#settingsForm");

    function set(name, value) {
      if (form.elements[name]) form.elements[name].value = value ?? "";
    }

    [
      "zaloPhone",
      "hotline",
      "email",
      "address",
      "shopee",
      "tiktok",
      "facebook",
      "instagram",
      "freeShipThreshold",
      "standardShipping",
      "expressShipping",
    ].forEach((key) => set(key, settings[key]));

    set("bankName", settings.bank?.name);
    set("bankAccount", settings.bank?.account);
    set("bankOwner", settings.bank?.owner);
  }

  $("#settingsForm").onsubmit = async (event) => {
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector("button[type=submit]");
    if(button.disabled)return;
    const formData = new FormData(form);
    button.disabled=true;button.textContent="Đang lưu…";
    const settings = {
      zaloPhone: formData.get("zaloPhone"),
      hotline: formData.get("hotline"),
      email: formData.get("email"),
      address: formData.get("address"),
      shopee: formData.get("shopee"),
      tiktok: formData.get("tiktok"),
      facebook: formData.get("facebook"),
      instagram: formData.get("instagram"),
      freeShipThreshold: Number(formData.get("freeShipThreshold") || 0),
      standardShipping: Number(formData.get("standardShipping") || 0),
      expressShipping: Number(formData.get("expressShipping") || 0),
      bank: {
        name: formData.get("bankName"),
        account: formData.get("bankAccount"),
        owner: formData.get("bankOwner"),
      },
    };

    try {
      await PAUS_ADMIN_API.saveSettings(settings);
      toast("Đã lưu cài đặt cửa hàng");
      const feedback=form.querySelector("[data-form-feedback]");feedback.hidden=false;feedback.className="admin-feedback";feedback.textContent="Cài đặt đã được lưu.";
    } catch (error) {
      ui.error(error.message || error);
    } finally {button.disabled=false;button.textContent="Lưu cài đặt";}
  };

  function csvCell(value) {
    return model.csvCell(value);
  }

  function downloadCsv(filename, rows) {
    const content = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  $("#exportProductsBtn").onclick = () => {
    downloadCsv("paus-products.csv", [
      ["ID", "Thương hiệu", "Tên", "Slug", "Danh mục", "Nhóm", "Giá từ", "Tồn kho", "Trạng thái"],
      ...products.map((product) => [
        product.id,
        product.brand,
        product.name,
        product.slug,
        product.category,
        product.collection,
        productMinPrice(product),
        product.stock,
        product.active !== false ? "Đang bán" : "Ẩn",
      ]),
    ]);
  };

  $("#exportOrdersBtn").onclick = () => {
    downloadCsv("paus-orders.csv", [
      ["Mã đơn", "Ngày", "Khách", "Điện thoại", "Tạm tính", "Giảm", "Ship", "Tổng", "Thanh toán", "Trạng thái"],
      ...orders.map((order) => {
        const customer = order.customer || {};
        return [
          orderCode(order),
          orderDate(order) || "",
          customer.name || "",
          customer.phone || "",
          order.subtotal || 0,
          order.discount || 0,
          order.shipping || 0,
          order.total || 0,
          order.payment || customer.payment || "",
          order.status || "",
        ];
      }),
    ]);
  };

  $("#exportSubscribersBtn").onclick = () => {
    downloadCsv("paus-newsletter.csv", [
      ["Email", "Ngày đăng ký", "Trạng thái"],
      ...subscribers.map((subscriber) => [
        subscriber.email,
        subscriber.created_at || "",
        subscriber.active !== false ? "Đang nhận" : "Tắt",
      ]),
    ]);
  };

  async function loadAll(showToast = false) {
    const refresh = $("#refreshAdmin");
    refresh.disabled = true;
    refresh.textContent = "Đang tải…";
    $("#adminGlobalMessage").hidden=true;
    $("#adminWorkspace").setAttribute("aria-busy","true");
    $$("#exportProductsBtn,#exportOrdersBtn,#exportSubscribersBtn,#addProductBtn,#dashboardAddProduct,#addCouponBtn,#settingsForm button[type=submit]").forEach(button=>button.disabled=true);

    try {
      [products, orders, coupons, subscribers] = await Promise.all([
        PAUS_ADMIN_API.listProducts(true),
        PAUS_ADMIN_API.listOrders(),
        PAUS_ADMIN_API.listCoupons(),
        PAUS_ADMIN_API.listSubscribers(),
      ]);

      fillSettings(await PAUS_ADMIN_API.getSettings());
      $("#collectionOptions").innerHTML=[...new Set(products.map(p=>p.collection).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi")).map(value=>`<option value="${esc(value)}"></option>`).join("");
      renderProducts();
      renderOrders();
      renderCoupons();
      renderSubscribers();
      renderStats();

      dataReady=true;
      if (showToast) toast("Đã làm mới dữ liệu");
    } catch (error) {
      console.error(error);
      ui.error(`Không tải được dữ liệu quản trị: ${error.message || error}`);
    } finally {
      refresh.disabled = false;
      refresh.textContent = "↻ Làm mới";
      $("#adminWorkspace").setAttribute("aria-busy","false");
      $$("#exportProductsBtn,#exportOrdersBtn,#exportSubscribersBtn,#addProductBtn,#dashboardAddProduct,#addCouponBtn,#settingsForm button[type=submit]").forEach(button=>button.disabled=!dataReady);
    }
  }

  $("#refreshAdmin").onclick = () => loadAll(true);

  $("#productModal").addEventListener("click", (event) => {
    if (event.target.id === "productModal") closeProduct();
  });
  $("#couponModal").addEventListener("click", (event) => {
    if (event.target.id === "couponModal") closeCoupon();
  });
  $("#orderModal").addEventListener("click", (event) => {
    if (event.target.id === "orderModal") closeOrder();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeProduct();
    closeCoupon();
    closeOrder();
  });

  await loadAll();
});
