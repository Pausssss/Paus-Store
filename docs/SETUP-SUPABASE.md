# Kết nối Supabase cho PAUS Studio

Mã nguồn giữ URL và khóa công khai trong cấu hình được cung cấp. Không có thay đổi nào được thực hiện trên dự án Supabase thật trong phiên phát triển này.

1. Kiểm tra dự án Supabase đã hoạt động. Nếu dự án đang paused, khôi phục trong dashboard của Supabase trước.
2. Chạy `supabase/schema.sql` trong SQL Editor của dự án cần dùng để chuẩn bị bảng, RPC, Auth/RLS và bucket ảnh. Đây là mã thiết lập; đọc các thay đổi chính sách trước khi áp vào một dự án đang có dữ liệu.
3. Nếu cần bổ sung danh mục từ file, chạy `supabase/seed.sql`. Bản Studio đã bỏ `TRUNCATE`: chỉ bổ sung các slug chưa có, không xóa sản phẩm, không reset ID và không ghi đè nội dung hiện có. Sản phẩm cũ cùng slug cần sửa bằng dashboard hoặc câu lệnh cập nhật có chủ đích.
4. Kiểm tra `assets/data/supabase-config.js`: `enabled`, `url`, `anonKey`. Chỉ dùng anon key hoặc publishable key. Không dùng service-role key phía trình duyệt.
5. Tạo người dùng quản trị qua Supabase Auth và thêm user ID/email đúng vào `public.admins` theo mô hình trong schema. Truy cập `/admin/login.html` để đăng nhập. Không có tài khoản/mật khẩu quản trị mặc định.
6. Kiểm tra các RPC `create_public_order`, `validate_coupon`, `subscribe_newsletter` và quyền cho vai trò anon. RPC đặt đơn tính lại giá và tổng tiền trên máy chủ, không tin tổng do trình duyệt gửi.
7. Điền cấu hình thực tế ở `store_settings`: thông tin liên hệ, ngân hàng, phí giao hàng, ngưỡng miễn phí. Giá trị `freeShipThreshold: 0` nghĩa là không áp dụng ngưỡng miễn phí. Trang checkout không tạo cam kết miễn phí khi thiếu ngưỡng.

Storefront dùng REST adapter cục bộ, có thời gian chờ cho mỗi request và đọc tiếp catalog sau giới hạn 1.000 hàng. Dashboard quản trị gốc vẫn dùng SDK Supabase chính thức từ CDN cho Auth/CRUD/upload.

Nếu catalog lỗi, client Auth vẫn được giữ để quản trị có thể chẩn đoán, còn checkout chuyển sang bản nháp được ghi nhãn rõ. Các coupon demo chỉ áp dụng trên localhost, không được xác nhận ở bản hosted khi hệ thống chưa sẵn sàng.

Đơn được tiếp nhận vẫn cần cửa hàng kiểm tra tồn thực tế, xác nhận và xử lý. Bản hiện tại không giữ chỗ/trừ tồn tự động, không gửi email tự động, không xác minh thanh toán ngân hàng và không đồng bộ trạng thái vận chuyển cho khách. Lịch sử khách thấy là bản tóm tắt tại lúc tạo được lưu trên thiết bị.

Sau khi triển khai, kiểm thử bằng thông tin thử có chủ đích trong dự án riêng trước khi dùng dự án kinh doanh thật.
