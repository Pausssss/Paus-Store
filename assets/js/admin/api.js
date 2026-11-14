/**
 * PAUS ADMIN 4.1 PRO — Supabase CRUD layer
 * All privileged operations are protected by Supabase Auth + RLS.
 */
window.PAUS_ADMIN_API = (() => {
  const backend = window.PAUS_BACKEND;

  function client() {
    return backend.getClient();
  }

  function localhost() {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  }

  async function prepareDemo() {
    if (backend.isConfigured() || !localhost()) return;
    const load = src => new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src; script.onload = resolve;
      script.onerror = () => reject(new Error("Chưa tải được dữ liệu dùng thử. Vui lòng tải lại trang."));
      document.head.appendChild(script);
    });
    if (typeof PRODUCTS === "undefined") await load("/assets/data/products.js");
    if (!window.COUPONS) await load("/assets/data/coupons.js");
    backend.demo.load();
  }

  async function requireAdmin() {
    const supabase = client();

    if (!supabase) {
      return {
        ok: localhost(),
        demo: localhost(),
        reason: "backend-unavailable",
        error: backend.getInitError?.() || null,
      };
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        ok: false,
        reason: "auth-error",
        error: sessionError,
      };
    }

    if (!session) {
      return { ok: false, reason: "no-session" };
    }

    const { data, error } = await supabase
      .from("admins")
      .select("user_id,email")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        reason: "admin-check-error",
        error,
      };
    }

    if (!data) {
      await supabase.auth.signOut();
      return { ok: false, reason: "not-admin" };
    }

    return {
      ok: true,
      session,
      admin: data,
      demo: false,
    };
  }

  async function signIn(email, password) {
    if (!client()) {
      if (localhost()) return { ok: true, demo: true };

      const initError = backend.getInitError?.();
      return {
        ok: false,
        error:
          initError?.message ||
          "Không thể kết nối Supabase. Kiểm tra Project URL và Publishable key.",
      };
    }

    const { data, error } = await client().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const check = await requireAdmin();
    if (!check.ok) {
      if (check.reason === "admin-check-error") {
        return {
          ok: false,
          error:
            check.error?.message ||
            "Không kiểm tra được quyền admin. Hãy chạy supabase/schema.sql trước.",
        };
      }

      return {
        ok: false,
        error: "Tài khoản này chưa được cấp quyền quản trị PAUS.",
      };
    }

    return { ok: true, data };
  }

  async function signOut() {
    if (client()) await client().auth.signOut();
  }

  function demoProducts() {
    return PRODUCTS.map((product, index) => ({
      ...product,
      active: product.active !== false,
      stock: product.stock ?? 0,
      sort_order: product.sort_order ?? index,
    }));
  }

  // Supabase caps one response; paginate every admin list with a stable order.
  async function readAll(makeQuery) {
    const rows=[],pageSize=1000;
    for(let offset=0;;offset+=pageSize){
      const {data,error}=await makeQuery().range(offset,offset+pageSize-1);
      if(error)throw error;
      const page=data||[];rows.push(...page);
      if(page.length<pageSize)return rows;
    }
  }

  async function listProducts(includeInactive = true) {
    if (!backend.isConfigured()) return demoProducts();
    const rows=await readAll(()=>{
      let query=client().from("products").select("*").order("sort_order",{ascending:true}).order("id",{ascending:true});
      return includeInactive?query:query.eq("active",true);
    });
    return rows.map(backend.normalizeProduct);
  }

  async function saveProduct(product) {
    const payload = {
      slug: product.slug,
      brand: product.brand,
      name: product.name,
      category: product.category,
      collection: product.collection,
      badge: product.badge || null,
      featured: Boolean(product.featured),
      rating: Number(product.rating ?? 0),
      reviews: Number(product.reviews || 0),
      features: product.features || [],
      short: product.short || "",
      description: product.description || "",
      material: product.material || "",
      fit: product.fit || "",
      origin: product.origin || "",
      style: product.style || "",
      image: product.image || "",
      gallery: product.gallery || [],
      sizes: product.sizes || {},
      variants: product.variants || [],
      stock: Number(product.stock || 0),
      active: product.active !== false,
      sort_order: Number(product.sort_order || 0),
    };

    if (!backend.isConfigured()) {
      const products = demoProducts();

      if (product.id) {
        const index = products.findIndex(
          (item) => String(item.id) === String(product.id),
        );
        if (index >= 0) {
          products[index] = {
            ...products[index],
            ...payload,
            id: products[index].id,
          };
        }
      } else {
        payload.id = Math.max(0, ...products.map((item) => Number(item.id) || 0)) + 1;
        products.push(payload);
      }

      PRODUCTS.splice(0, PRODUCTS.length, ...products);
      backend.demo.saveProducts(products);
      return products.find(item=>String(item.id)===String(product.id||payload.id));
    }

    const query = product.id
      ? client().from("products").update(payload).eq("id", product.id)
      : client().from("products").insert(payload);

    const { data, error } = await query.select("*").single();
    if (error) throw error;

    await backend.refreshCatalog().catch(()=>{});
    return backend.normalizeProduct(data);
  }

  async function deleteProduct(id) {
    if (!backend.isConfigured()) {
      const products = demoProducts().filter(
        (item) => String(item.id) !== String(id),
      );
      PRODUCTS.splice(0, PRODUCTS.length, ...products);
      backend.demo.saveProducts(products);
      return;
    }

    const { error } = await client().from("products").delete().eq("id", id);
    if (error) throw error;

    await backend.refreshCatalog().catch(()=>{});
  }

  function validateImage(file) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];

    if (!allowed.includes(file.type)) {
      throw new Error("Ảnh phải là JPG, PNG, WEBP hoặc AVIF.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Mỗi ảnh tối đa 5MB.");
    }
  }

  async function uploadProductImage(file) {
    if (!backend.isConfigured()) {
      throw new Error("Upload ảnh cần Supabase.");
    }

    validateImage(file);

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${new Date().getFullYear()}/${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extension}`;

    const { error } = await client().storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) throw error;

    return client().storage.from("product-images").getPublicUrl(path).data
      .publicUrl;
  }

  async function uploadProductImages(files) {
    const urls = [];

    for (const file of files) {
      urls.push(await uploadProductImage(file));
    }

    return urls;
  }

  async function listOrders() {
    if (!backend.isConfigured()) return PAUS.orders();
    return readAll(()=>client().from("orders").select("*").order("created_at",{ascending:false}).order("id",{ascending:false}));
  }

  async function updateOrderStatus(id, status) {
    if (!backend.isConfigured()) return;

    const { error } = await client()
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  }

  async function listCoupons() {
    if (!backend.isConfigured()) {
      return Object.entries(window.COUPONS || {}).map(([code, value], index) => ({
        id: index + 1,
        code,
        active: true,
        ...value,
      }));
    }

    const { data, error } = await client()
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function saveCoupon(coupon) {
    const payload = {
      code: coupon.code.trim().toUpperCase(),
      type: coupon.type,
      value: Number(coupon.value || 0),
      label: coupon.label || coupon.code.trim().toUpperCase(),
      active: coupon.active !== false,
    };

    if (!backend.isConfigured()) {
      window.COUPONS[payload.code] = payload;
      backend.demo.saveCoupons(window.COUPONS);
      return payload;
    }

    const query = coupon.id
      ? client().from("coupons").update(payload).eq("id", coupon.id)
      : client().from("coupons").insert(payload);

    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  }

  async function deleteCoupon(id, code) {
    if (!backend.isConfigured()) {
      delete window.COUPONS[code];
      backend.demo.saveCoupons(window.COUPONS);
      return;
    }

    const { error } = await client().from("coupons").delete().eq("id", id);
    if (error) throw error;
  }

  async function getSettings() {
    if (!backend.isConfigured()) {
      return { ...STORE_CONFIG, bank: { ...(STORE_CONFIG.bank || {}) } };
    }

    const { data, error } = await client()
      .from("store_settings")
      .select("data")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    const live = data?.data || {};
    return {
      ...STORE_CONFIG,
      ...live,
      bank: { ...(STORE_CONFIG.bank || {}), ...(live.bank || {}) },
    };
  }

  async function saveSettings(settings) {
    if (!backend.isConfigured()) {
      Object.assign(STORE_CONFIG, settings);
      backend.demo.saveSettings(settings);
      return settings;
    }

    const { error } = await client().from("store_settings").upsert({
      id: 1,
      data: settings,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    Object.assign(STORE_CONFIG, settings);
    return settings;
  }

  async function listSubscribers() {
    if (!backend.isConfigured()) return [];
    return readAll(()=>client().from("newsletter_subscribers").select("id,email,active,created_at").order("created_at",{ascending:false}).order("id",{ascending:false}));
  }

  async function deleteSubscriber(id) {
    if (!backend.isConfigured()) return;

    const { error } = await client()
      .from("newsletter_subscribers")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  return {
    requireAdmin,
    prepareDemo,
    signIn,
    signOut,
    listProducts,
    saveProduct,
    deleteProduct,
    uploadProductImage,
    uploadProductImages,
    listOrders,
    updateOrderStatus,
    listCoupons,
    saveCoupon,
    deleteCoupon,
    getSettings,
    saveSettings,
    listSubscribers,
    deleteSubscriber,
  };
})();
