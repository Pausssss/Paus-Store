# PAUS 6.2 — tốc độ tải và màu thương hiệu

## Thay đổi đã thực hiện

- Login/admin bỏ yêu cầu tải snapshot `products.js` 1.379.999 byte trước khi xử lý Auth. Chỉ chế độ demo localhost mới nạp dữ liệu này khi cần.
- Backend không tải lại catalog công khai trước khi admin kiểm tra session/quyền rồi đọc danh mục quản trị. Trang thông tin không đọc bảng sản phẩm cho đến khi khách mở tìm kiếm hoặc giỏ.
- Trang chủ và cửa hàng dựng giao diện ngay từ dữ liệu có sẵn. Request catalog chạy riêng; khi thành công, lưới sản phẩm được cập nhật, giữ nguyên tìm kiếm và bộ lọc đã chọn.
- Snapshot catalog/cài đặt công khai còn hạn tối đa 120 giây được dùng lại trong cùng phiên trình duyệt. Cache gắn với URL project, không dùng cache hết hạn hay từ project khác. Lỗi lưu trữ không ngăn việc duyệt web.
- Xác nhận đơn, coupon và email vẫn cần phản hồi của backend thật. Không dùng cache để tạo thành công giả. RPC đặt đơn vẫn tính lại giá trên máy chủ.
- Khi admin lưu/xóa sản phẩm, cache công khai trong phiên hiện tại được xóa. Khách ở phiên khác có thể thấy snapshot tối đa 2 phút trước khi tải lại.
- CSS/JS trong `dist` có `?v=<hash nội dung>`. Service worker có phiên bản theo toàn bộ assets, dùng lại tài nguyên công khai trong cùng bản phát hành. Tài nguyên mới đổi nội dung sẽ có version mới sau build, gồm cả khi chỉ thay ảnh.
- Service worker không xử lý trang/mã admin, cấu hình kết nối, tài nguyên khác origin hoặc thao tác POST. Các phản hồi Auth/đơn/khách không được đưa vào cache này.
- Tăng giới hạn chờ REST để không báo lỗi quá sớm khi backend phản hồi chậm: 8 giây cho đọc, 12 giây cho thao tác RPC. Nội dung trang chủ/cửa hàng không phải chờ khoảng này để hiện.

## Sửa giao diện theo ảnh được cung cấp

- Chuyển sang xanh dương nhạt `#b9daf7`, nền lạnh `#f5f8fc`, chữ xanh than `#182b3b` ở storefront/admin.
- Khung logo dùng flex, chiều cao xác định, giới hạn kích thước ảnh và ẩn phần tràn. Dòng tên sản phẩm có khoảng cách riêng; giữ nguyên các file logo gốc.
- Điều khiển hero dùng SVG thay ký tự font và gom vào một thanh công cụ. Giữ nút dừng, bàn phím, các điều kiện tạm dừng và prefers-reduced-motion.

## Phạm vi đã kiểm tra

36 kiểm thử logic đạt. Kiểm tra tĩnh: 20 HTML, 27 JS, 313 tham chiếu nội bộ. Output build đã đối chiếu 233 tham chiếu CSS/JS với hash thực và xác nhận hai trang admin không tải snapshot catalog.

Đã xem hai ảnh lỗi của người dùng. Chưa chạy trình duyệt, chưa đo Lighthouse/Core Web Vitals, chưa chụp lại layout hay kiểm tra tốc độ từ mạng của người dùng. Không có tỷ lệ tăng tốc hoặc số mili giây nào được khẳng định cho trải nghiệm thực tế. Kết nối Internet, vị trí Supabase, trạng thái project và cache của trình duyệt vẫn ảnh hưởng thời gian nhận dữ liệu.

Triển khai lên Vercel từ thư mục đã liên kết bằng `npm run deploy:prod`. Build sẽ tạo các phiên bản tài nguyên tự động. Lần đầu mở bản mới có thể cần chờ service worker thay cache cũ; sau đó các tài nguyên công khai đã lưu được dùng lại.
