# Các phần cần xác nhận trước khi bán hàng

Bản Studio đã build và kiểm tra logic; phạm vi chưa kiểm thử được ghi trong QA-REPORT.md.

- Xác nhận lại thông tin liên hệ, ngân hàng, phí giao, điều kiện đổi trả và khả năng cung ứng từ dữ liệu cửa hàng.
- Kiểm tra Supabase đang hoạt động, RPC/RLS và tài khoản admin. Thực hiện một đơn kiểm thử có chủ đích và kiểm tra đúng bản ghi được tiếp nhận.
- Xem các loại trang trên desktop/mobile ở 360, 390, 768, 1024 và 1440 px; kiểm tra tràn ngang, menu, lọc, giá theo màu/size, modal và form.
- Kiểm tra Tab/Shift+Tab, Escape và chế độ giảm chuyển động.
- Nếu đổi tên miền, cập nhật canonical/metadata/sitemap/robots; giữ trang quản trị và thông tin đơn ngoài kết quả tìm kiếm.
- Kiểm tra bản nháp chưa gửi và yêu cầu được hệ thống tiếp nhận hiển thị đúng hai trạng thái. Không dùng giao diện này để xác nhận tiền đã được chuyển.
