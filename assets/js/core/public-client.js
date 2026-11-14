/* Dependency-free public REST adapter. Admin retains the official Supabase SDK. */
window.PAUS_PUBLIC_CLIENT = {
  createClient(url, key) {
    const origin = String(url).replace(/\/$/, "");
    if (!/^https:\/\//.test(origin)) throw new Error("Địa chỉ kết nối chưa hợp lệ.");
    async function request(path, options = {}) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.method === "POST" ? 12000 : 8000);
      try {
        const response = await fetch(`${origin}/rest/v1/${path}`, { ...options, credentials: "omit", signal: controller.signal,
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...options.headers } });
        const body = await response.json().catch(() => null);
        if (!response.ok) return { data: null, error: new Error(`Chưa thể kết nối hệ thống (${response.status}). Vui lòng thử lại hoặc liên hệ PAUS.`) };
        return { data: body, error: null };
      } catch (error) {
        return { data: null, error: new Error(error.name === "AbortError" ? "Kết nối quá thời gian chờ. Vui lòng thử lại." : "Chưa kết nối được hệ thống. Vui lòng kiểm tra mạng hoặc liên hệ PAUS.") };
      } finally { clearTimeout(timer); }
    }
    return {
      from(table) {
        const params = new URLSearchParams(), orders = []; let single = false;
        const builder = {
          select(fields) { params.set("select", fields); return builder; },
          eq(field, value) { params.set(field, `eq.${value}`); return builder; },
          order(field, { ascending = true } = {}) { orders.push(`${field}.${ascending ? "asc" : "desc"}`); params.set("order", orders.join(",")); return builder; },
          range(start, end) { params.set("offset", start); params.set("limit", end-start+1); return builder; },
          maybeSingle() { single = true; return builder; },
          then(resolve, reject) { return request(`${encodeURIComponent(table)}?${params}`).then(result => {
            if (single && !result.error) result.data = result.data?.[0] || null; return result;
          }).then(resolve, reject); }
        }; return builder;
      },
      rpc(name, payload) { return request(`rpc/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(payload) }); }
    };
  }
};
