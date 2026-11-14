# Quản trị PAUS — bản 6.2

Mở `/admin/login.html` trên tên miền đang dùng và đăng nhập bằng tài khoản Supabase Auth đã có quyền trong bảng `admins`. Bản này dùng lại kết nối và phân quyền hiện có; không tạo tài khoản hay mật khẩu mặc định.

## Các màn hình

- **Tổng quan:** sản phẩm đang bán, sản phẩm nổi bật, tổng đơn, đơn chờ xác nhận, doanh thu đơn đã giao/hoàn thành và email đăng ký. Số liệu lấy từ dữ liệu đọc được, không thêm dữ liệu minh họa.
- **Sản phẩm:** tìm theo tên, thương hiệu hoặc mã; hỗ trợ không dấu, lọc danh mục/trạng thái, phân trang 30 dòng. Mỗi dòng là bản ghi nguồn để giữ đúng SKU. Website khách mua tự gộp các màu cùng mẫu.
- **Đơn hàng:** tìm theo mã, khách hoặc số điện thoại, lọc trạng thái, phân trang 15 đơn, xem chi tiết và cập nhật sau phản hồi lưu từ hệ thống.
- **Mã giảm giá:** tạo, sửa và xóa ưu đãi; tỷ lệ từ trên 0 đến 100%, hoặc giá trị tiền lớn hơn 0; có trạng thái bật/tắt.
- **Email đăng ký:** tìm kiếm, phân trang, xuất CSV và xóa địa chỉ đã chọn.
- **Cài đặt:** thông tin liên hệ, các kênh bán hàng, phí giao và tài khoản thanh toán. Ngưỡng miễn phí vận chuyển bằng 0 là không áp dụng.

## Sửa sản phẩm

1. Chọn **Sửa** đúng dòng nguồn. Kiểm tra tên, thương hiệu, đường dẫn và trạng thái hiển thị.
2. Quản lý từng màu tại **Màu sắc, size & giá bán**. Mỗi màu có ảnh chính, ảnh bổ sung, tồn kho và danh sách size/giá riêng.
3. **Áp dụng tất cả** đặt một giá cho mọi size của màu đang sửa. Size bị trùng hoặc không có giá hợp lệ sẽ được yêu cầu sửa trước khi lưu.
4. Các phần ảnh chung, mô tả/thông số và đánh giá được thu gọn, mở ra khi cần. Tổng tồn kho được cộng từ từng màu.
5. Chọn **Lưu sản phẩm** và chờ phản hồi. Khi đổi tên màu, mã biến thể hiện có được giữ để liên kết và giỏ cũ không trỏ nhầm. Gallery không bị mất khi lưu.

Muốn tạm ngừng bán, tắt **Hiển thị sản phẩm**. **Xóa** là xóa bản ghi nguồn và có bước xác nhận; không dùng thay cho ẩn sản phẩm.

## Kết nối và phản hồi

- Thông báo **Dùng thử trên máy** chỉ có ở localhost khi chưa kết nối được backend. Các thay đổi demo được ghi nhãn rõ và không cập nhật dữ liệu kinh doanh.
- Khi tải lỗi, dùng **Làm mới**. Các nút xuất/thêm bị khóa cho đến khi đã đọc được dữ liệu để tránh thao tác trên danh sách chưa đầy đủ.
- Admin tải tiếp nhiều trang dữ liệu thay vì dừng ở giới hạn 1.000 dòng của một phản hồi Supabase.
- Không có thay đổi SQL bắt buộc để dùng UI mới. Giữ thiết lập Auth/RLS đang có; xem `SETUP-SUPABASE.md` nếu cài trên một dự án hoàn toàn mới.
- Đơn được tiếp nhận vẫn cần cửa hàng xác nhận tồn và xử lý. Hệ thống hiện chưa tự trừ tồn, đối soát thanh toán hoặc đồng bộ vận chuyển.

## Vị trí chỉnh mã

| Phần | Tệp |
| --- | --- |
| Bố cục quản trị | `admin/index.html`, `admin/login.html` |
| Giao diện, responsive, motion | `assets/css/admin.css` |
| Màn hình và thao tác CRUD | `assets/js/admin/admin.js` |
| Form, sidebar và quản lý focus modal | `assets/js/admin/ui.js` |
| Tìm kiếm, phân trang, ánh xạ biến thể, CSV | `assets/js/admin/data.js` |
| Kết nối Supabase | `assets/js/admin/api.js` |

Chạy `npm test`, rồi `npm run build`. Triển khai lên Vercel bằng `npm run deploy:prod` và chọn đúng project PAUS cũ khi được hỏi.

Các kiểm thử hiện dùng dữ liệu và phản hồi mô phỏng, chưa đăng nhập hay ghi vào database thật. Xem `QA-REPORT.md` để biết giới hạn kiểm tra trình duyệt.

Bản 6.2 không tải danh mục snapshot trước khi đăng nhập. Sau khi xác minh quyền, admin đọc danh mục đầy đủ trực tiếp từ Supabase. Dữ liệu dùng thử được tải riêng khi chạy localhost và không có client kết nối.
