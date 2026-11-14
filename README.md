# PAUS Store — Studio 6.2

Website tiếng Việt bán giày, quần áo và phụ kiện, nâng cấp từ mã nguồn PAUS-STORE được cung cấp. Dùng HTML/CSS/JavaScript thuần và Supabase; không thêm framework hay thư viện chuyển động. Giữ đủ dữ liệu của **1.050 dòng sản phẩm gốc**; storefront tự gom thành **1.003 mẫu**, với ảnh, size và giá riêng cho mỗi màu/phiên bản.

Hướng thiết kế: nền trắng lạnh, chữ xanh than, điểm nhấn xanh dương nhạt; bố cục biên tập thời trang và ảnh sản phẩm gốc. Luồng mua sắm: khám phá → lọc → chọn màu/size → giỏ hàng → thông tin nhận hàng → tiếp nhận qua hệ thống hoặc chuẩn bị bản nháp gửi Zalo.

## Chạy và build

Cần Node.js 18 trở lên; kiểm tra tự động đã chạy bằng Node.js 24.19.0. Dự án không có dependency cần tải để chạy storefront.

```bash
npm run dev
```

Mở `http://localhost:3000`. Trên Windows có thể nhấp `tools/run-local.cmd`. Lệnh tự tạo `dist/` rồi phục vụ thư mục này. Sau khi chỉnh mã nguồn, chạy lại lệnh hoặc chạy `npm run build` và tải lại trang.

```bash
npm test
npm run build
```

Triển khai thư mục `dist/` lên hosting tĩnh có hỗ trợ trang 404. Cấu hình Vercel đã có `buildCommand` và `outputDirectory`. Không cần đưa `supabase/`, `tests/` hoặc tài liệu lên thư mục công khai. `vercel.json` chỉ dùng nếu chọn Vercel; bản Sites sử dụng cấu hình riêng trong `.openai/hosting.json`.

## Các màn hình

| Nhóm | Trang |
| --- | --- |
| Khám phá | `index.html`, `about.html`, `collections.html`, `collection.html?slug=daily-rotation` |
| Mua sắm | `shop.html`, `product.html?id=1` hoặc `product.html?slug=mlb-flare-mary-jane`, `wishlist.html`, `cart.html` |
| Hoàn tất | `checkout.html`, `orders.html` |
| Nội dung | `journal.html`, `article.html?slug=do-chan-chon-size`, `size-guide.html` |
| Hỗ trợ | `contact.html`, `faq.html`, `policies.html` |
| Trạng thái | `404.html`, `offline.html` |
| Quản trị gốc | `admin/login.html`, `admin/index.html` |

Bộ sưu tập là ba nhóm gợi ý chọn/phối sản phẩm; không mô tả chiến dịch hợp tác với các nhãn hàng. Sáu bài Journal là nội dung biên tập tiếng Việt. Không thêm nhận xét khách hàng, số liệu bán hàng hay chứng nhận.

## Chức năng

- Lọc kết hợp danh mục, thương hiệu, bộ sưu tập và khoảng giá; tìm không cần dấu; sắp xếp; phân trang 24 sản phẩm. Bộ lọc và trang hiện tại được giữ trong URL.
- Tìm kiếm toàn site, xem nhanh, chọn đúng màu và size, giá theo từng lựa chọn. Nút cộng ở thẻ mở lựa chọn, không tự chọn size nhỏ nhất.
- Giỏ hàng, yêu thích và lịch sử trên thiết bị; loại bỏ dữ liệu giỏ hỏng hoặc biến thể không còn hợp lệ. Giới hạn số lượng theo tồn tổng của biến thể trong dữ liệu; cửa hàng vẫn cần xác nhận khả năng cung ứng.
- Form kiểm tra trường bắt buộc, email, điện thoại và địa chỉ; hiển thị lỗi tại trường. Tư vấn chuẩn bị tin nhắn để người dùng tự gửi qua Zalo.
- Menu di động, drawer, modal và tìm kiếm có focus trap, Escape, focus trả về và nền `inert`. Ảnh chi tiết mở bằng native dialog.
- Hero vào theo thứ tự, reveal khi cuộn, ảnh/nút hover, drawer và modal chuyển trạng thái bằng transform/opacity. Có `prefers-reduced-motion`, không khóa hoặc thay thế cuộn tự nhiên.
- Điều hướng có mục “Trang chủ” trỏ đúng về trang đầu trên desktop và mobile; 20 thương hiệu dùng file logo gốc lấy từ website hãng, có nguồn và mã kiểm tra trong `docs/BRAND-SOURCES.json`.
- Ảnh nổi bật tự đổi màu mỗi 4,5 giây; có nút trước/sau/dừng, dừng khi hover/focus/tab ẩn hoặc bật giảm chuyển động.
- Pipeline `assets/js/core/catalog.js` tự gộp khi đọc cả catalog local và live. Giỏ/URL cũ được ánh xạ sang mẫu chung, checkout gửi đúng ID và biến thể gốc cho máy chủ.
- Không phụ thuộc ảnh hay phông chữ tải từ bên ngoài cho storefront. Phần quản trị gốc vẫn dùng Supabase SDK từ CDN.

## Nhận đơn và nhận email thật

Giữ cấu hình kết nối được cung cấp tại `assets/data/supabase-config.js`. Đã đọc catalog công khai trực tuyến (1.050 dòng); bản này **không đăng nhập, sửa dữ liệu hoặc tạo đơn thử trên cơ sở dữ liệu thật**. Trạng thái hoạt động của dự án Supabase cần được chủ cửa hàng kiểm tra.

- Khi đọc được catalog tương thích và RPC trả về mã đơn, website hiển thị **hệ thống đã tiếp nhận**, rồi xóa giỏ. Đây chưa phải xác nhận thanh toán hay xác nhận giao hàng.
- Khi chưa kết nối được catalog hoặc chưa cấu hình, checkout tạo **bản nháp trên thiết bị — chưa gửi**. Giỏ được giữ lại. Khách sao chép, mở Zalo và tự nhấn gửi.
- Nếu thao tác gửi gặp lỗi, không có thông báo thành công. Khách nên kiểm tra với PAUS trước khi thử lại vì lỗi kết nối có thể xảy ra sau khi máy chủ đã nhận yêu cầu.
- Newsletter chỉ báo tiếp nhận sau phản hồi RPC thành công; không có đăng ký thành công giả ở chế độ dự phòng.
- Không có thanh toán trực tuyến, webhook xác minh chuyển khoản, email gửi tự động hoặc theo dõi vận chuyển trực tiếp.

Đọc `docs/SETUP-SUPABASE.md` để cấu hình RPC/Auth/RLS. Cần tài khoản quản trị thật để đăng nhập dashboard ngoài localhost. Không đưa service-role key vào mã phía trình duyệt.

## Chỉnh nội dung

| Nội dung | Vị trí |
| --- | --- |
| Điện thoại, Zalo, email, ngân hàng, phí giao | `assets/data/config.js`; nếu kết nối live thì `store_settings` trong Supabase ưu tiên cấu hình vận hành |
| Quy tắc gộp mẫu và ánh xạ SKU gốc | `assets/js/core/catalog.js` |
| Logo thương hiệu và nguồn | `assets/data/brands.js`, `assets/images/brands/`, `docs/BRAND-SOURCES.json` |
| Sản phẩm/màu/size/giá/ảnh | `assets/data/products.js`; hoặc dashboard Supabase khi chạy live |
| Bộ sưu tập, bài viết | `assets/data/editorial.js` |
| Trang chủ, giới thiệu, chính sách | Các tệp HTML tương ứng |
| Token, bố cục, responsive, animation | `assets/css/studio.css` |
| Header, footer, giỏ, xem nhanh | `assets/js/core/store.js` |
| Accessibility, form, reveal, zoom | `assets/js/core/init.js` |
| REST adapter và kết nối | `assets/js/core/public-client.js`, `assets/js/core/backend.js` |

Dữ liệu vận hành live có thể thay thế danh mục cục bộ. Chỉnh bản cục bộ không tự cập nhật cơ sở dữ liệu. Nếu dùng tên miền khác, sửa canonical/metadata trong HTML, `product.js`, `sitemap.xml` và `robots.txt`.

## Phạm vi kiểm tra

Đã chạy **36 kiểm thử logic**, kiểm tra cú pháp **27 tệp JavaScript**, metadata/ID/nhãn form và **313 tham chiếu tài nguyên cục bộ trên 20 trang HTML**; build tĩnh thành công. Có kiểm tra toàn bộ ảnh được tham chiếu bởi 1.050 sản phẩm.

Chưa chạy kiểm tra giao diện bằng trình duyệt, chụp ảnh desktop/mobile, đo Core Web Vitals hoặc kiểm thử bàn phím thực tế trong phiên này vì công cụ trình duyệt phù hợp không có. CSS có các bố cục riêng cho desktop/tablet/mobile, nhưng cần kiểm chứng trực quan tại 360, 390, 768, 1024 và 1440 px trước khi sử dụng thương mại. Supabase, dashboard với tài khoản thật, Zalo và luồng thanh toán thực tế cũng chưa được kiểm thử đầu cuối.

Chi tiết tại `docs/QA-REPORT.md` và `docs/EDIT-GUIDE.md`.

Chi tiết bản cập nhật menu/logo/gộp màu: `docs/CATALOG-GROUPING.md`.

## Bản 6.1 — điều hướng và quản trị

- Mục Trang chủ thay liên kết Menu bị trùng. Nhãn trang hiện tại hoạt động cả đường dẫn `.html` và URL rút gọn.
- Tinh gọn trang chủ, footer và các tiêu đề; bỏ nhãn trang trí lặp, mô tả hướng dẫn được sinh tự động và các dòng thông số chưa có dữ liệu. Mô tả sản phẩm thực do cửa hàng nhập vẫn hiển thị.
- Admin có giao diện mới cho đăng nhập, tổng quan, sản phẩm, đơn, ưu đãi, email và cài đặt. Danh sách có phân trang, tìm kiếm không dấu và trạng thái tải/lỗi.
- Đọc tiếp các trang Supabase để không thiếu dữ liệu sau dòng 1.000. Sửa sản phẩm giữ ID màu, gallery và thông tin bổ sung theo size; kiểm tra size trùng và giá không hợp lệ.
- Hướng dẫn quản trị tại `docs/ADMIN-GUIDE.md`.

Cập nhật website Vercel từ thư mục dự án đã liên kết:

```bash
npm run deploy:prod
```

Nếu hỏi liên kết dự án, chọn project PAUS đang dùng. Không cần chạy lại SQL chỉ để cập nhật UI.

## Bản 6.2 — xanh dương nhạt và tải nhanh hơn

- Bảng màu mới: nền `#f5f8fc`, chữ `#182b3b`, nhấn `#b9daf7`; áp dụng ở cửa hàng và admin. Các logo thương hiệu gốc giữ nguyên hình và màu.
- Logo sản phẩm có khung giới hạn và khoảng cách riêng, không để ảnh logo tràn vào tên. Điều khiển ảnh nổi bật dùng icon SVG và một thanh công cụ gọn.
- Trang chủ và danh sách sản phẩm dựng nội dung từ snapshot hiện có trước khi chờ catalog trực tuyến; cập nhật lưới sau khi nhận dữ liệu mới. Các bộ lọc vẫn giữ trạng thái.
- Login và admin live không tải snapshot 1.050 sản phẩm. Backend admin chỉ khởi tạo Auth; dữ liệu quản trị được đọc sau khi kiểm tra quyền. Snapshot chỉ tải khi dùng chế độ demo trên localhost.
- Catalog và cài đặt **công khai** được lưu tối đa 2 phút trong sessionStorage, theo đúng project. Cache hết hạn hoặc khác project bị bỏ qua. Auth, thông tin khách và dữ liệu admin không vào bộ đệm này.
- Trang giới thiệu/bài viết/hỗ trợ chỉ tải cài đặt cần thiết; tìm kiếm và giỏ vẫn có thể lấy catalog khi khách mở. Nhiều thao tác cùng lúc dùng chung một request đang chạy.
- Build tự gắn phiên bản nội dung cho CSS/JS, đồng thời tạo phiên bản service worker từ toàn bộ assets. Ảnh/tài nguyên công khai đã lưu được dùng ngay; admin, cấu hình kết nối và yêu cầu ghi không bị service worker giữ lại.

Chi tiết và giới hạn đo tốc độ tại `docs/PERFORMANCE.md`. Bản này chưa đo LCP, INP hoặc tốc độ giao diện thực trong trình duyệt.
