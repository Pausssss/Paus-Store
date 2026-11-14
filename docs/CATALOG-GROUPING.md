# Rà dữ liệu và gộp màu PAUS

Ngày rà: 20/10/2026. Thực hiện trên file nguồn và danh mục công khai trực tuyến; không ghi dữ liệu vào Supabase.

| Nguồn | Dòng gốc | Mẫu sau gộp | Nhóm đã gộp | Giá theo size được đối chiếu | Giá bị thay đổi/mất |
| --- | ---: | ---: | ---: | ---: | ---: |
| File nguồn | 1.050 | 1.003 | 25 | 2.121 | 0 |
| Danh mục trực tuyến | 1.050 | 1.003 | 25 | 2.127 | 0 |

Dữ liệu trực tuyến có một số tên/slug, size và thuộc tính biến thể khác snapshot trong file. Khi kết nối hoạt động, website dùng dữ liệu trực tuyến, không ghi đè nó bằng snapshot. Các slug cũ đang có trong file vẫn được ánh xạ theo ID nếu bản ghi được đổi tên. Không tuyên bố hai nguồn hoàn toàn giống nhau.

## Cách hiển thị

47 dòng riêng lẻ đã được gom vào mẫu chung, giúp danh sách giảm từ 1.050 xuống 1.003 mục. Mỗi màu/phiên bản có ảnh, bộ size và giá riêng. Chọn thumbnail màu trên thẻ để đổi ảnh; màu được giữ khi mở nhanh hoặc vào chi tiết.

Đây là xử lý tự động khi đọc catalog local, dữ liệu demo hoặc catalog live. Không cần sửa tay từng thẻ và không cần chạy SQL để bật tính năng. Các bản ghi nguồn vẫn được giữ cho dashboard và tính giá trên máy chủ. Checkout ánh xạ từng size về đúng SKU/biến thể nguồn; không gửi ID của một mẫu khác để thay thế.

Nếu hai bản ghi cùng màu có giá khác nhau cho cùng size, website giữ hai lựa chọn được ghi rõ. Không tự lấy giá cao hơn/thấp hơn để xóa mất lựa chọn kia. Tồn gộp của cùng một lựa chọn dùng mức lớn nhất từ bản ghi nguồn; không cộng trùng tồn của một mặt hàng được nhập lặp.

## Những nhóm đã gộp

| Thương hiệu | Mẫu chung | ID nguồn | Màu/phiên bản |
| --- | --- | --- | ---: |
| MLB | Liner Mid Denim NY | 39, 48 | 3 |
| Nike | Nike V2K Run | 64, 65, 70, 75, 79, 92 | 6 |
| Jordan | Jordan 1 Low | 66, 67, 77, 80, 86, 89 | 6 |
| Jordan | Jordan · 553558 | 76, 90 | 2 |
| Nike | Nike Vapor Pro 3 · FZ2158 | 84, 93 | 2 |
| Nike | Nike Vapor 12 · FV5554 | 94, 97 | 2 |
| ASICS | ASICS Resolution · 1042A279 | 99, 100, 103, 110 | 5 |
| Skechers | Skechers Viper Court Pro 2.0 | 101, 109 | 2 |
| ASICS | ASICS GEL · 1042A294 | 102, 116, 128 | 3 |
| ASICS | ASICS GAME FF · 1041A489 | 111, 119 | 2 |
| ASICS | ASICS GEL Resolution · 1041A481 | 114, 118 | 2 |
| ASICS | ASICS Court FF 3 · 1041A370 | 115, 123 | 2 |
| ASICS | ASICS · 1041A492 | 120, 125 | 2 |
| Puma | Puma Speedcat Ballet · 401287 | 132, 136 | 2 |
| Jeep | Jeep Light · P651W13112 | 134, 144 | 2 |
| MLB | Marty Bag Size 12 | 168, 171, 173 | 5 |
| MLB | Tee NY 39kw | 224, 232 | 3 |
| MLB | Tee Kid NY | 257, 267 | 2 |
| WHO.A.U | Tee Calstate | 457, 460 | 2 |
| MLB | Bomber NY viền sọc | 733, 734 | 2 |
| New Era | Cardigan NY New Era | 824, 825 | 2 |
| WHO.A.U | Nỉ Who Basic 25 | 1015, 1018 | 2 |
| Other | Vali ký gửi vân dọc 24 inch | 1031, 1033, 1035, 1037, 1039, 1041, 1042, 1043 | 8 |
| Other | Vali khung 22 inch | 1036, 1038 | 2 |
| Ralph Lauren | Tee RL logo thêu | 1045, 1046, 1047, 1048, 1049, 1050 | 7 |

## Những trường hợp được giữ riêng

Các tên chung như “Asics”, “Sweatshirt”, “Chân váy”, “Tee Das” hoặc “TEE25 034” không đủ để xác định một mẫu. Đã đối chiếu ảnh ở các nhóm có tên trùng: áo khác hình in, chân váy khác họa tiết, bomber khác patch và vali khác thiết kế tiếp tục nằm riêng. Hai mẫu Badblood TEE25 034 được bổ sung mô tả chữ lớn/logo nhỏ để dễ phân biệt.

Đường dẫn ảnh rỗng cũ của Badblood PTS25-053 trong dữ liệu live đã có ảnh thông báo đang cập nhật đúng định dạng WebP, tránh lỗi tải ảnh. Không lấy ảnh của mẫu khác để thay thế.

Hai bản ghi bị gán sai nhóm hãng trong file được chuẩn hóa khi hiển thị: AdiFOM Superstar từ Jeep sang adidas và Asic Court Gum từ Jeep sang ASICS. ID/giá/nguồn đặt hàng không thay đổi.

## Logo và chuyển động

20 thương hiệu xác định dùng file logo lấy từ website chính thức. Tệp nằm trong assets/images/brands, ánh xạ trong assets/data/brands.js; URL nguồn, ngày lấy và SHA-256 nằm trong docs/BRAND-SOURCES.json. Không vẽ lại, không tạo bằng AI và không dùng favicon thay cho logo. Logo trắng giữ nguyên màu và đặt trên nền tối.

Other và Eyewear là nhãn phân loại chưa xác định hãng, nên chỉ dùng tên chữ, không gán một logo được tự tạo.

Ảnh hero tự chuyển giữa các màu của Nike V2K Run sau 4,5 giây, có trước/sau/dừng. Tự dừng khi hover, focus, tab ẩn hoặc nằm ngoài vùng xem; chế độ giảm chuyển động tắt tự phát. Chuyển động này không thay đổi lựa chọn màu khách đang đặt ở trang chi tiết.

## Kiểm tra

21 kiểm thử logic, kiểm tra cú pháp 25 file JavaScript và tham chiếu tĩnh trên 18 trang đã đạt. Có kiểm thử ánh xạ giỏ/yêu thích/liên kết cũ, xung đột giá và các mẫu không được gộp nhầm. Tất cả 20 logo đã được render riêng để kiểm tra hình dạng và màu.

Chưa kiểm tra giao diện tương tác bằng trình duyệt vì công cụ control-browser phù hợp chưa có trong môi trường. Đã đọc catalog công khai trực tuyến; chưa thử đặt đơn, đăng nhập quản trị hoặc ghi dữ liệu thật.
