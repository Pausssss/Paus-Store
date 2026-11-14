/**
 * PAUS STORE 4.1 PRO — Data Provider
 *
 * Chế độ Supabase:
 * - Catalog + store settings đọc từ database.
 * - Coupon được kiểm tra từng mã qua RPC, không public toàn bộ danh sách.
 * - Đơn hàng được PostgreSQL tính lại giá/tổng tiền trước khi lưu.
 * - Newsletter được lưu qua RPC.
 *
 * Chế độ fallback/local:
 * - Website vẫn chạy bằng assets/data/*.js để dễ demo và phát triển giao diện.
 */
window.PAUS_BACKEND = (() => {
  const cfg = window.PAUS_SUPABASE || {};
  const localProductKey = "paus_fashion_demo_products_v6";
  const localSettingsKey = "paus_fashion_demo_settings_v5";
  const localCouponsKey = "paus_fashion_demo_coupons_v5";

  let client = null;
  let mode = "fallback";
  let initError = null;
  const isAdmin = document.body?.dataset?.admin === "true";
  const skipCatalog = document.body?.dataset?.catalog === "skip";
  const catalogCacheKey = "paus_public_catalog_v1";
  const settingsCacheKey = "paus_public_settings_v1";
  const cacheLifetime = 120000;
  let pendingRefresh = null;
  let pendingCatalog = null;
  let catalogReady = false;

  function notify(name) {
    if (typeof CustomEvent !== "undefined") document.dispatchEvent?.(new CustomEvent(name));
  }

  function readCache(key) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || "null");
      return value && value.origin === cfg.url && Date.now() - value.savedAt >= 0 && Date.now() - value.savedAt < cacheLifetime ? value : null;
    } catch { return null; }
  }

  function writeCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ ...data, origin: cfg.url, savedAt: Date.now() })); } catch { /* Browsing still works when storage is unavailable. */ }
  }

  function applySettings(settings) {
    if (!settings || typeof settings !== "object") return;
    const live = { ...settings };
    delete live.brand; delete live.subBrand; delete live.tagline;
    Object.assign(STORE_CONFIG, live);
    notify("paus:settings-ready");
  }

  function applyProducts(rows) {
    if (typeof PRODUCTS === "undefined") return;
    if (window.PAUS_CATALOG && !isAdmin) window.PAUS_CATALOG.apply(rows, PRODUCTS);
    else PRODUCTS.splice(0, PRODUCTS.length, ...rows);
  }

  async function loadSettings() {
    const result = await client.from("store_settings").select("data").eq("id", 1).maybeSingle();
    if (result.error) throw result.error;
    const settings = result.data?.data || {};
    applySettings(settings);
    writeCache(settingsCacheKey, { settings });
    return settings;
  }

  function hasCredentials() {
    return Boolean(
      cfg.enabled &&
        cfg.url &&
        cfg.anonKey &&
        (window.supabase?.createClient || window.PAUS_PUBLIC_CLIENT?.createClient),
    );
  }

  function safeJson(value, fallback) {
    if (value == null) return fallback;
    if (typeof value === "object") return value;

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function normalizeProduct(row) {
    return {
      id: Number(row.id),
      slug: row.slug,
      brand: row.brand || "",
      name: row.name || "",
      category: row.category || "Sneakers",
      collection: row.collection || "MLB Footwear",
      badge: row.badge || "",
      featured: Boolean(row.featured),
      rating: Number(row.rating ?? 5),
      reviews: Number(row.reviews ?? 0),
      features: safeJson(row.features, []),
      short: row.short || "",
      description: row.description || "",
      material: row.material || "",
      fit: row.fit || "",
      origin: row.origin || "",
      style: row.style || "",
      image: row.image || "assets/images/product-fallback.svg",
      gallery: safeJson(row.gallery, []).filter(Boolean),
      sizes: safeJson(row.sizes, {}),
      variants: safeJson(row.variants, []),
      stock: Number(row.stock ?? 0),
      active: row.active !== false,
      sort_order: Number(row.sort_order ?? 0),
    };
  }

  function loadDemoOverrides() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

    try {
      const products = JSON.parse(localStorage.getItem(localProductKey) || "null");
      if (typeof PRODUCTS !== "undefined" && Array.isArray(products) && products.length) {
        if(window.PAUS_CATALOG&&!document.body?.dataset?.admin)window.PAUS_CATALOG.apply(products,PRODUCTS);
        else PRODUCTS.splice(0,PRODUCTS.length,...products);
      }

      const settings = JSON.parse(
        localStorage.getItem(localSettingsKey) || "null",
      );
      if (settings && typeof settings === "object") {
        Object.assign(STORE_CONFIG, settings);
      }

      const coupons = JSON.parse(
        localStorage.getItem(localCouponsKey) || "null",
      );
      if (coupons && typeof coupons === "object") {
        window.COUPONS = coupons;
      }
    } catch {
      // Demo data is optional; ignore corrupted local storage.
    }
  }

  async function loadCatalog() {
    if (!client) return;

    const readProducts = async () => {
      const rows = [];
      for (let start = 0; ; start += 1000) {
        const result = await client.from("products").select("*").eq("active", true)
          .order("sort_order", { ascending: true }).order("id", { ascending: true }).range(start, start+999);
        if (result.error) return result;
        rows.push(...(result.data || []));
        if ((result.data || []).length < 1000) break;
      }
      return { data: rows, error: null };
    };
    const [productsRes, settingsRes] = await Promise.all([
      readProducts(), client.from("store_settings").select("data").eq("id",1).maybeSingle()
    ]);

    if (productsRes.error) throw productsRes.error;

    const liveRows = productsRes.data || [];
    const normalizedRows = liveRows.map(normalizeProduct);

    // Không cho catalog phiên bản cũ ghi đè storefront thời trang mới.
    // Nếu database chưa chạy schema/seed v5, website tiếp tục dùng catalog fallback mới.
    const legacyCatalog = liveRows.some((row) => row.features == null);

    if (!legacyCatalog) {
      // Live mode hợp lệ: bảng rỗng sẽ hiển thị catalog rỗng đúng trạng thái database.
      applyProducts(normalizedRows);
      catalogReady = true;
      mode = "supabase";
      initError = null;
      writeCache(catalogCacheKey, { rows: normalizedRows });
      notify("paus:catalog-ready");
    } else {
      mode = "fallback";
      console.warn(
        "PAUS: database đang dùng catalog phiên bản cũ. Storefront tạm dùng catalog fashion fallback; hãy chạy supabase/schema.sql và supabase/seed.sql.",
      );
    }

    if (!settingsRes.error && settingsRes.data?.data) {
      applySettings(settingsRes.data.data);
      writeCache(settingsCacheKey, { settings: settingsRes.data.data });
    }
  }

  async function init() {
    loadDemoOverrides();
    initError = null;

    if (!hasCredentials()) {
      return { mode, error: null };
    }

    try {
      // Quan trọng: giữ client sống ngay cả khi catalog lỗi.
      // Admin/Auth vẫn cần client để đăng nhập và báo lỗi database rõ ràng.
      client = (window.supabase || window.PAUS_PUBLIC_CLIENT).createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      mode = "supabase";
    } catch (error) {
      initError = error;
      client = null;
      mode = "fallback";
      console.error("PAUS: không thể khởi tạo Supabase client.", error);
      return { mode, error };
    }

    // Auth must not wait for a public product catalog. The admin API loads its
    // authorized data after requireAdmin() has verified the session.
    if (isAdmin) return { mode, error: null };

    const cachedSettings = readCache(settingsCacheKey);
    if (cachedSettings) applySettings(cachedSettings.settings);
    if (skipCatalog) {
      if (!cachedSettings) pendingRefresh = loadSettings().catch(error => { initError = error; });
      return { mode, error: null };
    }

    const cached = readCache(catalogCacheKey);
    if (cached && Array.isArray(cached.rows)) {
      applyProducts(cached.rows);
      catalogReady = true;
      // Reuse only a recent public snapshot. No repeat download within the TTL;
      // customer, order, Auth and admin responses never enter this cache.
      return { mode, error: null, cached: true };
    }

    try {
      await ensureCatalog();
    } catch (error) {
      // Storefront vẫn dùng dữ liệu fallback, nhưng KHÔNG hủy client.
      // Nhờ vậy /admin không bị treo ở 'Đang tải…'.
      initError = error;
      mode = "fallback"; // Keep Auth client for admin; storefront orders become explicit drafts.
      console.warn(
        "PAUS: Supabase client đã kết nối nhưng catalog chưa tải được. " +
          "Hãy kiểm tra schema.sql / RLS / Project URL / publishable key.",
        error,
      );
    }

    return { mode, error: initError };
  }

  async function validateCoupon(code) {
    const normalized = String(code || "")
      .trim()
      .toUpperCase();

    if (!normalized) return null;

    if (!client || mode !== "supabase") {
      if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) throw new Error("Chưa thể xác minh mã ưu đãi. PAUS sẽ kiểm tra khi xác nhận đơn.");
      const item = window.COUPONS?.[normalized];
      return item ? { ...item, code: normalized } : null;
    }

    const { data, error } = await client.rpc("validate_coupon", {
      p_code: normalized,
    });

    if (error) throw error;
    return data || null;
  }

  /**
   * Create a live order through PostgreSQL RPC.
   * Price/discount/shipping are recalculated server-side.
   */
  async function createOrder(draft) {
    if (!client) return null;

    const items = (draft.items || []).map(item => window.PAUS_CATALOG
      ? window.PAUS_CATALOG.sourceItem(item)
      : { id:Number(item.id), variant:item.variant||"default", size:item.size, qty:Number(item.qty||1) });

    const { data, error } = await client.rpc("create_public_order", {
      p_customer: draft.customer || {},
      p_items: items,
      p_coupon: draft.coupon || null,
      p_shipping_method: draft.shippingMethod || "standard",
    });

    if (error) throw error;
    return data;
  }

  async function subscribeNewsletter(email) {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Vui lòng nhập email hợp lệ.");

    if (!client) {
      throw new Error("Đăng ký email hiện chưa kết nối. Email của bạn chưa được gửi; vui lòng liên hệ PAUS hoặc thử lại sau.");
    }

    const { error } = await client.rpc("subscribe_newsletter", {
      p_email: normalized,
    });

    if (error) throw error;
    return { ok: true, mode: "supabase" };
  }

  function getClient() {
    return client;
  }

  function getMode() {
    return mode;
  }

  function isConfigured() {
    // Chỉ xem là live khi client thật đã được tạo.
    return Boolean(client);
  }

  function hasSupabaseCredentials() {
    return hasCredentials();
  }

  function getInitError() {
    return initError;
  }

  function refreshCatalog() {
    try { sessionStorage.removeItem(catalogCacheKey); sessionStorage.removeItem(settingsCacheKey); } catch {}
    if (isAdmin) return Promise.resolve();
    catalogReady = false;
    return ensureCatalog();
  }

  function ensureCatalog() {
    if (!client || isAdmin || catalogReady) return Promise.resolve();
    if (pendingCatalog) return pendingCatalog;
    const cached = readCache(catalogCacheKey);
    if (cached && Array.isArray(cached.rows)) {
      applyProducts(cached.rows); catalogReady = true;
      return Promise.resolve();
    }
    pendingCatalog = loadCatalog().catch(error => {
      initError = error; mode = "fallback";
      throw error;
    }).finally(() => { pendingCatalog = null; });
    return pendingCatalog;
  }

  const demo = {
    load: loadDemoOverrides,
    saveProducts(products) {
      if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
      localStorage.setItem(localProductKey, JSON.stringify(products));
    },

    saveSettings(settings) {
      if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
      localStorage.setItem(localSettingsKey, JSON.stringify(settings));
    },

    saveCoupons(coupons) {
      if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
      localStorage.setItem(localCouponsKey, JSON.stringify(coupons));
    },

    clear() {
      [localProductKey, localSettingsKey, localCouponsKey].forEach((key) => {
        localStorage.removeItem(key);
      });
    },
  };

  return {
    init,
    validateCoupon,
    createOrder,
    subscribeNewsletter,
    getClient,
    getMode,
    isConfigured,
    hasSupabaseCredentials,
    getInitError,
    refreshCatalog,
    ensureCatalog,
    whenRefreshed: () => pendingCatalog || pendingRefresh || window.PAUS_DATA_READY,
    normalizeProduct,
    demo,
  };
})();

window.PAUS_DATA_READY = window.PAUS_BACKEND.init();

window.PAUS_BOOT = (callback, { waitForData = !document.body?.dataset?.catalog } = {}) => {
  const run = async () => {
    try {
      if (waitForData) await window.PAUS_DATA_READY;
    } catch (error) {
      console.warn("PAUS data init warning:", error);
    }

    try {
      await callback();
    } catch (error) {
      console.error("PAUS boot error:", error);
      window.dispatchEvent(new CustomEvent("paus:boot-error", { detail: error }));
    }
  };
  if (document.readyState === "loading" || !document.readyState) document.addEventListener("DOMContentLoaded", run);
  else run();
};
