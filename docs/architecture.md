# Cấu trúc website xem phòng

Phiên bản hiện tại tập trung vào khách xem ảnh, tìm phòng, so sánh mức giá theo khung giờ và liên hệ November. Có 4 chi nhánh: Điện Biên Phủ, Phú Nhuận, Hoàng Sa và Hai Bà Trưng.

## Các phần chính

- `src/main.ts`: khởi động giao diện, chọn trang danh sách hoặc chi tiết theo đường dẫn.
- `src/data/catalog.json`: thông tin chi nhánh, ảnh, giá và tiện nghi của các phòng.
- `src/data/catalog-repository.ts`: cung cấp dữ liệu cho giao diện và kiểm tra tính hợp lệ.
- `src/domain/catalog.ts`: định nghĩa dữ liệu, tìm kiếm không dấu, lọc phòng và sắp xếp giá.
- `src/features/catalog/`: trang tìm phòng, bộ lọc, chi nhánh và thao tác lưu phòng.
- `src/features/room/`: trang chi tiết, bộ ảnh và tin nhắn hỏi phòng.
- `src/shared/`: định dạng giá, xử lý giao diện, liên kết bản đồ và ngày theo múi giờ Việt Nam.
- `src/styles/`: giao diện máy tính và điện thoại.
- `public/`: ảnh và các trang chuyển hướng từ đường dẫn cũ.
- `tests/`: kiểm tra dữ liệu, tìm phòng và nội dung trang chi tiết.

Giao diện sử dụng dữ liệu qua `CatalogRepository`. Hiện dữ liệu được đọc từ JSON; cấu trúc này vẫn cho phép thay nguồn dữ liệu sau này khi có nhu cầu.

## Cập nhật website

Sửa thông tin phòng ở `src/data/catalog.json`, thêm ảnh vào `public/img/`. Giữ nguyên mã chi nhánh và mã phòng để liên kết tiếp tục hoạt động. Giá theo mã khung giờ `morning`, `afternoon`, `overnight`, `daily`, không phụ thuộc thứ tự trong danh sách.

Sửa bố cục trang chủ ở `index.html`, phần chi tiết ở `src/features/room/room-view.ts` và giao diện ở `src/styles/main.css`.

Lưu phòng yêu thích chỉ ghi mã phòng trên trình duyệt của khách. Khách liên hệ trực tiếp với Nov để xác nhận phòng trống và đặt phòng.

## Xuất bản

Chạy `npm run build`, sau đó xuất bản nội dung thư mục `dist/` lên GitHub Pages. Bản hiện tại không cần máy chủ hoặc cơ sở dữ liệu riêng.
