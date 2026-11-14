# Kết quả kiểm tra PAUS Studio

Ngày thực hiện: 20/10/2026. Runtime: Node.js 24.19.0. Không gửi dữ liệu thử đến backend thật.

## Đã chạy

`npm test` đạt 36/36 trường hợp:

1. Newsletter không báo thành công khi không có hệ thống tiếp nhận.
2. Coupon demo không được xác nhận trên hosted site khi chưa có kiểm tra máy chủ.
3. Catalog lỗi: giữ client quản trị, checkout chuyển về bản nháp.
4. Đọc tiếp catalog vượt giới hạn REST 1.000 hàng.
5. REST adapter gửi bộ lọc đúng và chỉ chấp nhận phản hồi thành công.
6. Phân trang cửa hàng thành các nhóm 24 sản phẩm không trùng nhau.
7. Bộ lọc thương hiệu/danh mục/giá kết hợp, giữ URL và khôi phục khi đặt lại.
8. Tìm kiếm/sắp xếp chạy trên dữ liệu catalog thực trong file.
9. 1.003 mẫu hiển thị giữ ID/slug riêng; 1.050 dòng gốc có ánh xạ đầy đủ; tất cả đường dẫn ảnh tham chiếu tồn tại và khác rỗng.
10. Giá theo biến thể/size; số lượng giới hạn theo tồn tổng của biến thể.
11. Dữ liệu lưu hỏng và biến thể cũ không bị chuyển thành một lựa chọn khác.
12. Yêu thích được lưu; nội dung sản phẩm được escape trong HTML.
13. Đơn dự phòng có nhãn bản nháp, chưa gửi và giữ giỏ hàng.
14. Lỗi máy chủ/thiếu mã xác nhận không tạo lịch sử thành công giả.
15. Phản hồi xác nhận thật (được mock trong test) mới được ghi là yêu cầu đã tiếp nhận.

16. Đủ 2.121 giá theo size từ dữ liệu gốc được giữ đúng sau khi gộp.
17. Cùng tên chung nhưng khác họa tiết/phom không bị gộp nhầm.
18. Một màu có hai mức giá vẫn giữ hai lựa chọn độc lập.
19. Giỏ hàng, yêu thích và liên kết cũ hoạt động sau khi gộp ID.
20. Màu bổ sung được gộp tự động; dashboard vẫn dùng bản ghi gốc để quản lý đúng SKU.
21. Đủ 20 file logo địa phương, nguồn website hãng và SHA-256 khớp.

Kiểm tra tĩnh đạt:

- Cú pháp 27 file JavaScript trong assets.
- 20 file HTML: 18 trang cửa hàng và 2 trang quản trị: viewport, ngôn ngữ, tiêu đề, ID không trùng và target của skip link.
- 313 tham chiếu tài nguyên/liên kết cục bộ trong HTML.
- Nhãn liên kết với trường nhập, không có link chỉ là `#`.
- Cân bằng khối CSS; đã sửa phần dư của dòng import font cũ.
- Build tạo được `dist/` bằng script không cần dependency.

Các test shop dùng adapter DOM tối thiểu để kiểm tra dữ liệu và trạng thái, không đại diện cho một browser engine.

## Chưa chạy

| Phạm vi | Trạng thái |
| --- | --- |
| Giao diện thực tại 360, 390, 768, 1024, 1440 px | Chưa kiểm tra bằng trình duyệt |
| Ảnh chụp desktop/mobile và độ mượt motion | Chưa chụp/đánh giá thực tế |
| Tab, Escape, focus trap, screen reader và native image dialog | Có triển khai; chưa kiểm thử tương tác thật |
| Lỗi console, tải ảnh trong trình duyệt, Core Web Vitals | Chưa đo trong trình duyệt |
| Catalog công khai Supabase | Đã đọc đủ 1.050 dòng, đối chiếu 2.127 giá theo size khi gộp; 0 sai lệch |
| RPC đặt đơn, RLS ghi, admin Auth/CRUD/upload | Chưa đăng nhập hay ghi thử |
| Gửi tin Zalo, email và thanh toán | Chưa thực hiện; không có thanh toán tự động |

Không có công cụ control-browser phù hợp trong môi trường phiên này. Theo quy trình Sites, không dựng browser thay thế. Vì vậy bản bàn giao đã build và kiểm tra mã, chưa được coi là đã vượt qua QA thị giác hay kiểm thử đầu cuối trên hạ tầng kinh doanh thật.

Logo SVG đã được kiểm tra cú pháp XML và render riêng bằng Sharp để xem đủ hình, tỷ lệ và màu. Đây là kiểm tra tài nguyên logo, không phải ảnh chụp giao diện website.

## Bản 6.1 — kiểm tra bổ sung

22. Admin đọc đủ 1.050 dòng ở sản phẩm, đơn và email qua mock SDK phân trang, không mất trang sau giới hạn phản hồi.
23. Phân trang 30 sản phẩm đi qua 1.050 dòng không trùng; bộ lọc kết hợp và tìm kiếm tiếng Việt không dấu đúng.
24. Sửa tên màu giữ ID gốc, ảnh gallery và metadata theo size; size trùng bị từ chối.
25. Kiểm tra quyền quản trị từ chối người chưa đăng nhập hoặc không có trong bảng admins (mock Auth/RLS response).
26. Máy chủ đã xác nhận lưu sản phẩm vẫn được coi là đã lưu nếu bước refresh danh mục sau đó lỗi; rating 0 không tự thành 5.
27. Xuất CSV giữ tiếng Việt, dấu ngoặc kép, số và vô hiệu hóa chuỗi có thể bị hiểu là công thức.
28. Chỉ ẩn câu hướng dẫn mô tả sinh tự động; nội dung mô tả thực được giữ.

Admin UI được kiểm tra cấu trúc HTML, nhãn form, tham chiếu asset, mã JavaScript và bộ biến đổi dữ liệu. Chưa đăng nhập tài khoản quản trị thực; chưa thực hiện thêm, sửa, xóa hoặc upload trên Supabase thật. Chưa có QA thị giác, thao tác menu/modal hoặc đăng nhập qua trình duyệt.

## Bản 6.2 — kiểm tra bổ sung hiệu năng và cache

29. Admin khởi tạo client Auth mà không đọc catalog công khai.
30. Catalog công khai còn hạn và đúng project được dùng ngay, không tải lại trong thời hạn 2 phút.
31. Cache hết hạn hoặc thuộc project khác không được sử dụng để bật chế độ live.
32. Các trang thông tin không tải catalog và không bị chặn bởi request cài đặt.
33. Callback giao diện có thể chạy trước khi callback cần dữ liệu đã hoàn tất tải.
34. Nhiều thao tác yêu cầu catalog cùng lúc dùng chung một request đang chạy.
35. Tài nguyên công khai đã cache được trả về mà không chờ request mạng mới.
36. Service worker bỏ qua admin, cấu hình Supabase, request khác origin và thao tác ghi.

Đã build và đối chiếu 233 tham chiếu CSS/JS có hash trong output với nội dung file thực. Hai HTML admin không còn tham chiếu snapshot sản phẩm đầy đủ. Kiểm thử static đạt 20 HTML, 27 JS, 313 liên kết/tài nguyên cục bộ.

Đã xem hai ảnh lỗi do người dùng cung cấp, sửa ràng buộc khung logo và cụm điều khiển hero. Chưa chụp lại giao diện bằng browser engine để xác nhận thị giác. Không tuyên bố các chỉ số tốc độ hay Core Web Vitals đã được đo.
