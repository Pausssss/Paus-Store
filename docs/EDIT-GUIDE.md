# Chỉnh nội dung PAUS Studio

## Nhận diện

Chỉnh token ở đầu `assets/css/studio.css`:

- Nền: `#f4f3ee`; giấy: `#fffefa`.
- Chữ: `#181a17`; chữ phụ: `#62645d`; đường phân cách: `#d8d9d0`.
- Nhấn: `#c9f24b`; lỗi: `#a62725`; trạng thái đạt: `#287244`.
- Font hệ thống có hỗ trợ tiếng Việt, ưu tiên Arial. Không cần tải font bên ngoài.
- Bo góc nhỏ, ảnh giữ tỷ lệ, không dùng shadow cho mọi khối. Chiều rộng nội dung tối đa 1.320 px.

`styles.css` giữ các cấu trúc nền tương thích với source gốc; `studio.css` là lớp thiết kế Studio. Ưu tiên chỉnh token và các nhóm selector trong file Studio để tránh ảnh hưởng dashboard dùng `admin.css` riêng.

## Catalog

`products.js` có mảng `PRODUCTS`. Mỗi sản phẩm có ID, slug, thương hiệu, danh mục và mảng `variants`. Mỗi biến thể có ảnh, tên màu, bảng `sizes` (size → giá) và tồn tổng `stock`. Giữ ID và slug ổn định để giỏ hàng và liên kết không trỏ nhầm sản phẩm.

Ảnh gốc được đóng gói trong `assets/images/products/`. Một ảnh rỗng của mã Badblood PTS25-053 đã được thay tham chiếu bằng ảnh thông báo cập nhật, không dùng ảnh sản phẩm khác để thay thế.

Bốn vị trí tuyển chọn trên trang chủ nằm trong `assets/js/pages/home.js`, chọn bằng slug để ổn định giữa dữ liệu local và Supabase. Hero dùng Nike V2K Run Grey Pink từ danh mục; có thể thay ảnh, tên và slug trong `index.html`.

Khi chạy live, `products` trong cơ sở dữ liệu mới là danh mục đang dùng. Không chỉnh file JS rồi kỳ vọng database tự đổi. `seed.sql` chỉ thêm slug mới, không cập nhật sản phẩm cũ.

## Journal và PAUS Edit

Chỉnh `window.PAUS_EDITORIAL` trong `assets/data/editorial.js`. Mỗi bài có slug, chủ đề, tiêu đề, mở đầu, ảnh và các phần nội dung. Mỗi bộ sưu tập có slug, ảnh, danh mục tương ứng và ghi chú phối đồ. Không cần tạo riêng HTML cho từng bài; `article.html` và `collection.html` đọc slug từ URL.

Ảnh biên tập hiện dùng ảnh sản phẩm người dùng cung cấp. Khi thêm ảnh từ nguồn khác, kiểm tra quyền sử dụng và ghi nguồn cần thiết. Không thêm đánh giá, số liệu bán hàng hoặc chứng nhận khi chưa có căn cứ.

## Motion

Hero: 500–700 ms theo thứ tự. Reveal: dịch 22 px, khoảng 600 ms, chỉ khởi tạo với phần nội dung ở dưới viewport. Hover: 200 ms cho nút, khoảng 650 ms cho ảnh. Drawer/modal: 250–450 ms. Có nhánh `prefers-reduced-motion`; nội dung không phụ thuộc vào animation để được đọc.

Bộ lọc thay đổi nội dung thật; trang mới được giữ trong URL. Không sử dụng scroll hijacking, chạy chữ vô hạn hoặc chặn người dùng chờ animation.

## Sau khi sửa

Chạy `npm test`, `npm run build`. Tải lại bản chạy từ `dist/`. Trình duyệt có thể đang lưu service worker; tải lại sau khi worker mới hoạt động nếu gặp giao diện cũ. Khi đóng gói bàn giao, bỏ `node_modules/`, `.git/`, `.env*` và tài nguyên kiểm tra nội bộ.


## Gộp màu tự động và logo

`assets/js/core/catalog.js` chạy trước lớp backend và nhận lại dữ liệu sau mỗi lần tải live. Nhóm được xác định bằng mã model hoặc các nhóm đã đối chiếu ảnh; không gộp toàn bộ sản phẩm chỉ vì trùng tên chung. Chọn màu trên thẻ xem ảnh, rồi mở nhanh hoặc vào chi tiết; màu đã chọn được giữ trong liên kết.

Không đổi ID hoặc xóa dữ liệu nguồn. Mỗi màu lưu nguồn SKU/biến thể cho từng size. Khi có hai giá khác nhau ở cùng màu/size, giữ hai lựa chọn rõ ràng, không tự chọn một giá để ghi đè. Dashboard vẫn giữ bản ghi nguồn, còn khách mua sắm thấy mẫu đã gộp. Không cần chạy SQL hoặc sửa từng sản phẩm để bật tính năng này.

Logo dùng tệp gốc trong `assets/images/brands/`; ánh xạ ở `assets/data/brands.js`. Nguồn chi tiết và SHA-256 ở `docs/BRAND-SOURCES.json`. Không có logo được vẽ lại hoặc tạo bằng AI. “Other” và “Eyewear” là nhãn phân loại chưa xác định hãng, nên không được gán logo giả.

Hero tự chuyển giữa các màu của Nike V2K Run, 4,5 giây mỗi màu, có nút điều khiển. Không tự đổi màu khách đang chọn ở trang chi tiết hoặc giỏ hàng.

## Màu chủ đạo và cache — 6.2

Màu xanh dương nhạt `#b9daf7`, nền `#f5f8fc`, chữ `#182b3b` được khai báo trong `:root` ở `studio.css` và `admin.css`. Không đổi màu file logo thương hiệu gốc. Chạy build sau khi sửa tài nguyên: script tự tạo hash CSS/JS và phiên bản cache mới; không cần sửa chuỗi version bằng tay.
