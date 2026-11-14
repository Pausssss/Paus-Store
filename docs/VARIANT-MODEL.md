# PAUS — Mô hình màu / size

- Catalog nguồn: 1450 listing còn hàng.
- Sau khi rà soát/gộp có kiểm soát: 1050 mẫu sản phẩm.
- Một mẫu có `variants[]`; mỗi variant có `label`, `image`, `gallery`, `sizes`, `stock`.
- Size chỉ hiển thị sau khi chọn màu/phiên bản tương ứng.
- Giỏ hàng và đơn hàng lưu cả product + variant + size.
- PostgreSQL RPC kiểm tra lại variant + size + giá khi tạo đơn.

Không tự gộp các nhóm có xung đột giá cho cùng màu + size; các trường hợp đó được giữ thành sản phẩm riêng để tránh sai dữ liệu.
