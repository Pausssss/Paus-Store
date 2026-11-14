PAUS_BOOT(() => {
  const form = document.getElementById("checkoutForm");
  const summary = document.getElementById("checkoutSummary");

  let coupon = null;
  let couponMessage = "Nhập mã ưu đãi (nếu có)";
  let submitting = false;

  function bankIsConfigured() {
    const bank = STORE_CONFIG.bank || {};
    const name = String(bank.name || "").trim();
    const account = String(bank.account || "").replace(/\s+/g, "");
    const owner = String(bank.owner || "").trim();
    return Boolean(name && owner && /^\d{6,20}$/.test(account));
  }

  const bankChoice = document.getElementById("bankPaymentChoice");
  if (bankChoice) {
    bankChoice.hidden = !bankIsConfigured();
  }

  function shippingMethod() {
    return new FormData(form).get("shipping") || "standard";
  }

  function previewShipping() {
    const subtotal = PAUS.cartSubtotal();

    if (coupon?.type === "shipping") return 0;
    if (
      shippingMethod() === "standard" &&
      Number(STORE_CONFIG.freeShipThreshold || 0) > 0 &&
      subtotal >= Number(STORE_CONFIG.freeShipThreshold)
    ) {
      return 0;
    }

    return shippingMethod() === "express"
      ? Number(STORE_CONFIG.expressShipping || 0)
      : Number(STORE_CONFIG.standardShipping || 0);
  }

  function previewDiscount() {
    const subtotal = PAUS.cartSubtotal();

    if (!coupon || coupon.type === "shipping") return 0;

    if (coupon.type === "percent") {
      return Math.round(
        subtotal * (Math.min(100, Number(coupon.value || 0)) / 100),
      );
    }

    return Math.min(subtotal, Number(coupon.value || 0));
  }

  function previewTotal() {
    return Math.max(
      0,
      PAUS.cartSubtotal() - previewDiscount() + previewShipping(),
    );
  }

  function updateShippingLabels() {
    const standard = document.getElementById("standardShippingLabel");
    const express = document.getElementById("expressShippingLabel");

    if (standard) {
      standard.textContent = `${PAUS.money(STORE_CONFIG.standardShipping)}${Number(STORE_CONFIG.freeShipThreshold)>0 ? ` · miễn phí từ ${PAUS.money(STORE_CONFIG.freeShipThreshold)}` : " · xác nhận khi chốt đơn"}`;
    }

    if (express) {
      express.textContent = `${PAUS.money(STORE_CONFIG.expressShipping)} · ưu tiên xử lý`;
    }
  }

  function render() {
    const cart = PAUS.cart();

    if (!cart.length) {
      summary.innerHTML = `
        <div class="empty">
          <h3>Giỏ hàng trống</h3>
          <a class="btn dark" href="shop.html">Về shop</a>
        </div>
      `;
      return;
    }

    const itemMarkup = cart
      .map((line) => {
        const product = PAUS.product(line.id);
        if (!product) return "";

        const v = PAUS.variant(product, line.variant);
        const unit = PAUS.sizePrice(product, line.variant, line.size);

        return `
          <div class="checkout-item">
            <img
              src="${PAUS.esc(PAUS.variantImage(product, line.variant))}"
              alt="${PAUS.esc(product.name)}"
              onerror="this.src='assets/images/product-fallback.svg'"
            >
            <div>
              <b>${PAUS.esc(product.name)}</b>
              <small>${PAUS.esc(v.label)} · Size ${PAUS.esc(line.size)} × ${line.qty}</small>
            </div>
            <span>${PAUS.money(unit * line.qty)}</span>
          </div>
        `;
      })
      .join("");

    const live = PAUS_BACKEND.getMode() === "supabase";

    summary.innerHTML = `
      <h3>Đơn hàng</h3>
      <div class="checkout-items">${itemMarkup}</div>

      <div class="coupon">
        <input
          id="couponInput"
          placeholder="Mã giảm giá"
          value="${coupon ? PAUS.esc(coupon.code) : ""}"
          autocomplete="off"
        >
        <button type="button" id="applyCoupon">
          ${coupon ? "Đã áp dụng" : "Áp dụng"}
        </button>
      </div>

      <div id="couponMsg" class="checkout-note">
        ${PAUS.esc(couponMessage)}
      </div>

      <div class="sumrow">
        <span>Tạm tính</span>
        <b>${PAUS.money(PAUS.cartSubtotal())}</b>
      </div>
      <div class="sumrow">
        <span>Giảm giá</span>
        <b>− ${PAUS.money(previewDiscount())}</b>
      </div>
      <div class="sumrow">
        <span>Vận chuyển</span>
        <b>${previewShipping() ? PAUS.money(previewShipping()) : "Miễn phí"}</b>
      </div>
      <div class="sumrow total">
        <span>Tổng cộng</span>
        <b>${PAUS.money(previewTotal())}</b>
      </div>

      <button
        class="btn dark full"
        id="placeOrder"
        type="submit"
        style="margin-top:15px"
        ${submitting ? "disabled" : ""}
      >${submitting ? "Đang xử lý…" : live ? "Gửi đơn tới PAUS ↗" : "Chuẩn bị đơn qua Zalo ↗"}</button>

      <p class="secure-note">
        ${
          live
            ? "Giá, ưu đãi và phí vận chuyển được kiểm tra lại trước khi xác nhận đơn."
            : "Đơn sẽ được chuẩn bị để bạn gửi qua Zalo. PAUS chỉ nhận được khi bạn nhấn gửi tin nhắn."
        }
      </p>
    `;

    const couponInput = document.getElementById("couponInput");
    const applyButton = document.getElementById("applyCoupon");

    applyButton.onclick = async () => {
      const code = couponInput.value.trim().toUpperCase();

      if (!code) {
        coupon = null;
        couponMessage = "Nhập mã ưu đãi (nếu có)";
        render();
        return;
      }

      applyButton.disabled = true;
      applyButton.textContent = "Đang kiểm tra…";

      try {
        const validated = await PAUS_BACKEND.validateCoupon(code);

        if (!validated) {
          coupon = null;
          couponMessage = "Mã giảm giá không hợp lệ hoặc đã hết hiệu lực.";
          render();
          return;
        }

        coupon = {
          code: validated.code || code,
          type: validated.type,
          value: Number(validated.value || 0),
          label: validated.label || code,
        };
        couponMessage = `Đã áp dụng ${coupon.code} — ${coupon.label} ✓`;
        PAUS.toast(`Đã áp dụng ${coupon.code}`);
        render();
      } catch (error) {
        console.error(error);
        coupon = null;
        couponMessage = "Không thể kiểm tra mã lúc này. Vui lòng thử lại.";
        render();
      }
    };
  }

  document.querySelectorAll('[name="shipping"]').forEach((radio) => {
    radio.addEventListener("change", render);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!PAUS.cart().length || submitting) return;

    if (!window.PAUS_FORMS.validate(form)) return;

    submitting = true;
    render();

    const formData = new FormData(form);
    const customer = Object.fromEntries(formData.entries());
    const items = PAUS.cart()
      .map((line) => {
        const product = PAUS.product(line.id);
        if (!product) return null;

        const v = PAUS.variant(product, line.variant);
        const unit = PAUS.sizePrice(product, line.variant, line.size);

        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          image: PAUS.variantImage(product, line.variant),
          variant: line.variant,
          variantLabel: PAUS.variant(product, line.variant).label,
          size: line.size,
          qty: line.qty,
          unit,
          line: unit * line.qty,
        };
      })
      .filter(Boolean);

    const draft = {
      customer,
      items,
      coupon: coupon?.code || "",
      shippingMethod: shippingMethod(),
      subtotal: PAUS.cartSubtotal(),
      discount: previewDiscount(),
      shipping: previewShipping(),
      total: previewTotal(),
      status: "Chờ xác nhận",
    };

    try {
      const order = await PAUS.createOrder(draft);
      const orderItems = order.items || items;
      const orderCustomer = order.customer || customer;

      let text = `PAUS — ĐƠN HÀNG ${order.id}\n\n`;
      text += "KHÁCH HÀNG\n";
      text += `${orderCustomer.name || ""}\n`;
      text += `${orderCustomer.phone || ""}\n`;
      text += `${orderCustomer.address || ""}, ${orderCustomer.city || ""}\n`;
      if (orderCustomer.email) text += `${orderCustomer.email}\n`;
      text += "\nSẢN PHẨM\n";

      orderItems.forEach((item, index) => {
        text += `${index + 1}. ${item.name} · ${item.variantLabel || "Mặc định"} · Size ${item.size} × ${item.qty} = ${PAUS.money(item.line)}\n`;
      });

      text += `\nTạm tính: ${PAUS.money(order.subtotal)}\n`;
      text += `Giảm giá: ${PAUS.money(order.discount)}\n`;
      text += `Vận chuyển: ${order.shipping ? PAUS.money(order.shipping) : "Miễn phí"}\n`;
      text += `TỔNG: ${PAUS.money(order.total)}\n`;

      if ((order.payment || orderCustomer.payment) === "bank") {
        text += "\nCHUYỂN KHOẢN\n";
        text += `${STORE_CONFIG.bank.name}\n`;
        text += `STK: ${STORE_CONFIG.bank.account}\n`;
        text += `Chủ TK: ${STORE_CONFIG.bank.owner}\n`;
        text += `Nội dung: ${order.id}\n`;
      }

      if (orderCustomer.note) {
        text += `\nGhi chú: ${orderCustomer.note}\n`;
      }

      text += "\nVui lòng xác nhận giúp mình đơn hàng này.";

      const live = !order.localOnly;
      let storageNote = order.localHistorySaved === false ? " Hệ thống đã nhận đơn nhưng trình duyệt không lưu được lịch sử trên thiết bị." : "";
      if (live) { try { PAUS.clearCart(); } catch { storageNote += " Trình duyệt chưa xóa được giỏ hàng cũ; vui lòng tránh gửi lại đơn này."; } }
      const result = document.getElementById("orderResult");
      result.hidden = false;
      result.innerHTML = `<span class="eyebrow">${live ? "HỆ THỐNG ĐÃ TIẾP NHẬN" : "BẢN NHÁP — CHƯA GỬI"}</span><h2>${live ? "Đã tiếp nhận yêu cầu đặt hàng." : "Nội dung đã sẵn sàng để bạn gửi."}</h2><p class="form-feedback">${live ? "Mã đơn: " + PAUS.esc(order.order_code || order.id) + ". PAUS sẽ kiểm tra và xác nhận trước khi giao. Đây chưa phải xác nhận thanh toán." + PAUS.esc(storageNote) : "Chưa có đơn nào được gửi đến PAUS. Giỏ hàng của bạn vẫn được giữ lại. Sao chép nội dung, mở Zalo và tự gửi để nhận xác nhận từ cửa hàng."}</p><label class="sr-only" for="orderText">Nội dung đơn hàng</label><textarea id="orderText">${PAUS.esc(text)}</textarea><div class="result-actions"><button type="button" class="btn dark" id="copyOrder">Sao chép nội dung</button><a class="btn light" href="https://zalo.me/${encodeURIComponent(STORE_CONFIG.zaloPhone)}" target="_blank" rel="noopener">Mở Zalo ↗</a><a class="btn light" href="orders.html">Xem đơn hàng đã lưu</a></div><p id="orderCopyStatus" class="form-feedback" role="status"></p>`;
      result.querySelector("#copyOrder").onclick = async () => {
        const ok = await PAUS.copy(result.querySelector("textarea").value).catch(() => false);
        document.getElementById("orderCopyStatus").textContent = ok ? "Đã sao chép. Bạn cần dán và gửi trong cuộc trò chuyện với PAUS." : "Chưa sao chép được. Hãy chọn nội dung trong ô và sao chép thủ công.";
      };
      form.hidden = true;
      result.focus();
      result.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
    } catch (error) {
      console.error(error);
      submitting = false;
      const result = document.getElementById("orderResult"); result.hidden=false;
      result.innerHTML=`<h2>Chưa nhận được xác nhận đơn.</h2><p role="alert" class="form-feedback error">${PAUS.esc(error.message || "Kết nối bị gián đoạn. Vui lòng thử lại.")}</p><p class="form-feedback">Giỏ hàng vẫn được giữ lại. Nếu bạn vừa gửi đơn, hãy kiểm tra với PAUS trước khi thử lại để tránh gửi trùng. Bạn có thể <a href="contact.html">liên hệ PAUS</a>.</p>`;
      render();
    }
  });

  updateShippingLabels();
  render();
});
