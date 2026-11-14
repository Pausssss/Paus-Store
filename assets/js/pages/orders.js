PAUS_BOOT(() => {
  const root = document.getElementById("ordersList");
  const orders = PAUS.orders();
  const created = new URLSearchParams(location.search).get("new");


  root.innerHTML = orders.length
    ? orders
        .map((order) => {
          const code = order.order_code || order.id;
          const date = order.created_at || order.createdAt;
          const items = order.items || [];

          return `
            <article class="order-card">
              <div class="order-head">
                <b>${PAUS.esc(code)}</b>
                <span>${date ? new Date(date).toLocaleString("vi-VN") : ""}</span>
              </div>
              <div class="order-products">
                ${items
                  .map(
                    (item) =>
                      `${PAUS.esc(item.name || "Sản phẩm")} · ${PAUS.esc(item.variantLabel || "Mặc định")} · Size ${PAUS.esc(item.size || "")} × ${Number(item.qty || 1)}`,
                  )
                  .join("<br>")}
              </div>
              <div class="order-foot">
                <span>${PAUS.esc(order.localOnly ? "Bản nháp trên thiết bị — chưa gửi" : order.status || "Yêu cầu đã tiếp nhận — chờ xác nhận")}</span>
                <b>${PAUS.money(order.total)}</b>
              </div>
            </article>
          `;
        })
        .join("")
    : `
      <div class="empty">
        <div class="empty-icon">◇</div>
        <h3>Chưa có đơn hàng đã lưu</h3>
        <p>Đơn hàng và bản nháp sẽ xuất hiện ở đây sau khi bạn tạo.</p>
        <a class="btn dark" href="shop.html">Bắt đầu mua sắm</a>
      </div>
    `;
});
