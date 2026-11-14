PAUS_BOOT(() => {
  const root = document.getElementById("cartPage");

  function render() {
    const cart = PAUS.cart();

    if (!cart.length) {
      root.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <div class="empty-icon">◇</div>
          <h3>Giỏ hàng đang trống</h3>
          <p>Chọn sản phẩm và size để bắt đầu đơn hàng.</p>
          <a class="btn dark" href="shop.html">Xem sản phẩm</a>
        </div>
      `;
      return;
    }

    const subtotal = PAUS.cartSubtotal();
    const lines = cart
      .map((line) => {
        const product = PAUS.product(line.id);
        if (!product) return "";
        const v = PAUS.variant(product, line.variant);
        const unit = PAUS.sizePrice(product, line.variant, line.size);
        return `
          <div class="cart-page-line">
            <img src="${PAUS.esc(PAUS.variantImage(product, line.variant))}" alt="${PAUS.esc(product.name)}" onerror="this.src='assets/images/product-fallback.svg'">
            <div>
              <small>${PAUS.esc(product.brand)}</small>
              <h3><a href="${PAUS.productUrl(product)}">${PAUS.esc(product.name)}</a></h3>
              <small>${PAUS.esc(v.label)} · Size: ${PAUS.esc(line.size)}</small>
              <div class="qty">
                <button data-cminus="${line.id}|${PAUS.esc(line.variant)}|${PAUS.esc(line.size)}" type="button">−</button>
                <b>${line.qty}</b>
                <button data-cplus="${line.id}|${PAUS.esc(line.variant)}|${PAUS.esc(line.size)}" type="button">＋</button>
              </div>
            </div>
            <div style="text-align:right">
              <b>${PAUS.money(unit * line.qty)}</b><br>
              <button class="filter-pill" data-cremove="${line.id}|${PAUS.esc(line.variant)}|${PAUS.esc(line.size)}" style="margin-top:12px" type="button">Xóa</button>
            </div>
          </div>
        `;
      })
      .join("");

    root.innerHTML = `
      <div class="cart-table">${lines}</div>
      <aside class="summary-card">
        <h3>Tóm tắt đơn</h3>
        <div class="sumrow"><span>Tạm tính</span><b>${PAUS.money(subtotal)}</b></div>
        <div class="sumrow"><span>Vận chuyển</span><span>Tính ở checkout</span></div>
        <div class="sumrow total"><span>Tổng dự kiến</span><b>${PAUS.money(subtotal)}</b></div>
        <a class="btn dark full" href="checkout.html" style="margin-top:15px">Tiếp tục thanh toán</a>
        <a class="btn light full" href="shop.html" style="margin-top:8px">Mua thêm</a>
      </aside>
    `;
  }

  root.addEventListener("click", (event) => {
    const minus = event.target.closest("[data-cminus]");
    const plus = event.target.closest("[data-cplus]");
    const remove = event.target.closest("[data-cremove]");

    if (minus || plus) {
      const button = minus || plus;
      const data = minus ? button.dataset.cminus : button.dataset.cplus;
      const [id, variantId, size] = data.split("|");
      const hit = PAUS.cart().find((line) => line.id === Number(id) && line.variant === variantId && line.size === size);
      if (hit) {
        if (minus && hit.qty <= 1) PAUS.removeCart(id, variantId, size);
        else PAUS.updateCart(id, variantId, size, hit.qty + (minus ? -1 : 1));
      }
      render();
      return;
    }

    if (remove) {
      const [id, variantId, size] = remove.dataset.cremove.split("|");
      PAUS.removeCart(id, variantId, size);
      render();
    }
  });

  render();
});
