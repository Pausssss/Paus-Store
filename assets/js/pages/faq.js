PAUS_BOOT(() => {
  const questions = [
    [
      "Làm sao chọn đúng size giày?",
      "Bạn có thể đo chiều dài bàn chân theo centimet và đối chiếu bảng size của từng sản phẩm. Nếu đang ở giữa hai size, hãy nhắn PAUS để được hỗ trợ trước khi đặt hàng.",
    ],
    [
      "Size quần áo có giống nhau giữa các hãng không?",
      "Không hoàn toàn. Mỗi hãng và mỗi dòng sản phẩm có thể dùng phom khác nhau. Hãy xem phần Form/Fit trên trang sản phẩm hoặc gửi chiều cao, cân nặng và size thường mặc để PAUS hỗ trợ.",
    ],
    [
      "Bao lâu nhận được hàng?",
      "Thời gian nhận hàng phụ thuộc địa chỉ và đơn vị vận chuyển. Sau khi xác nhận đơn, PAUS sẽ thông báo thời gian dự kiến cụ thể.",
    ],
    [
      "Có đổi size hoặc đổi trả không?",
      "PAUS tiếp nhận theo chính sách công bố trên website. Sản phẩm cần giữ nguyên tình trạng và khách nên quay video mở gói để đối chiếu nếu có sai sót hoặc hư hỏng vận chuyển.",
    ],
    [
      "Mã giảm giá dùng thế nào?",
      "Nhập mã ở trang hoàn tất đơn. Chỉ áp dụng khi hệ thống kiểm tra thành công. Khi chưa kết nối được hệ thống, PAUS sẽ kiểm tra lại ưu đãi trong bước xác nhận.",
    ],
    [
      "Đơn hàng có được lưu không?",
      "Xem đơn và bản nháp trong mục “Đơn hàng đã lưu” trên trình duyệt đã dùng. Bản nháp có nhãn chưa gửi. Liên hệ PAUS kèm mã đơn để biết tiến độ giao hàng.",
    ],
    [
      "Website hỗ trợ hình thức thanh toán nào?",
      "PAUS hỗ trợ COD và xác nhận đơn qua Zalo. Chuyển khoản được hướng dẫn sau khi cửa hàng xác nhận đơn.",
    ],
  ];

  const root = document.getElementById("faqList");
  root.innerHTML = questions
    .map(
      ([question, answer]) => `
        <article class="faq-item">
          <button class="faq-q" type="button">
            ${PAUS.esc(question)}<span>＋</span>
          </button>
          <div class="faq-a">${PAUS.esc(answer)}</div>
        </article>
      `,
    )
    .join("");

  root.addEventListener("click", (event) => {
    const button = event.target.closest(".faq-q");
    if (button) button.parentElement.classList.toggle("open");
  });
});
