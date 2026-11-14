PAUS_BOOT(() => {
  const grid = document.getElementById("wishGrid");
  function render() {
    const products = PAUS.wishlist().map(PAUS.product).filter(Boolean);
    grid.innerHTML = products.length
      ? products.map(PAUS.card).join("")
      : `
        <div class="empty" style="grid-column:1/-1">
          <div class="empty-icon">♡</div>
          <h3>Chưa có sản phẩm yêu thích</h3>
          <p>Bấm biểu tượng trái tim để lưu những sản phẩm bạn muốn xem lại.</p>
          <a class="btn dark" href="shop.html">Khám phá shop</a>
        </div>
      `;
  }
  render();
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-wish]")) setTimeout(render, 50);
  });
});
