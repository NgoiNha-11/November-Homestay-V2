# November Homestay · v2

Website TypeScript + Vite cho 4 chi nhánh, 20 phòng. Bản này hỗ trợ tiếng Việt/Anh, hỏi phòng qua tin nhắn và tạo link danh sách phòng trống bằng form. Không cần database.

## Chạy trên máy

Dùng Node.js **22.12 trở lên** và npm.

```sh
npm ci
npm run dev
```

Mở địa chỉ được hiển thị. Không mở trực tiếp file `index.html`: mã TypeScript cần chạy qua Vite hoặc bản build.

## Kiểm tra trước khi push

```sh
npm run format:check
npm test
npm run build
npm run check:site
```

`check:site` chạy trên bản đã build trong `dist/`. Kiểm tra các trang ở cả tiếng Việt/Anh, tại tên miền gốc và đường dẫn có tên repo: bộ lọc, yêu thích, menu, banner, ảnh phòng, chia sẻ/sao chép, chọn chi nhánh, nội quy, form tạo danh sách và link khách. Đồng thời kiểm tra đường dẫn nội bộ, thẻ neo và tên file chính xác cả chữ hoa/thường.

Đây là kiểm tra tương tác tự động trong môi trường DOM, không thay thế kiểm tra bố cục trên điện thoại hoặc đăng nhập ứng dụng Zalo/WhatsApp thật. Các thao tác gửi tin nhắn không được thực hiện trong kiểm thử.

Có thể xem bản xuất bản trên máy:

```sh
npm run preview
```

## Đưa lên GitHub Pages

1. Tạo repo v2 thuộc tài khoản November, mời `HongAnh-11` với quyền ghi và nhận lời mời.
2. Push toàn bộ mã nguồn, bao gồm `.github/`, `public/`, `src/`, `scripts/`, `tests/`, `package.json` và `package-lock.json`. Không push `node_modules/` hoặc `dist/` (đã được bỏ qua trong `.gitignore`).
3. Trong repo, vào **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` sẽ kiểm tra, build và xuất bản khi push lên `main` hoặc `master`; cũng có thể chạy thủ công từ tab Actions. Pull request chỉ chạy kiểm tra, không xuất bản.
5. Chờ workflow hoàn tất và thử URL Pages mới trước khi chuyển tên miền. Cấu hình Vite dùng đường dẫn tương đối để hỗ trợ cả `https://<tài-khoản>.github.io/<repo>/` và tên miền riêng.
6. Khi sẵn sàng chuyển v1 sang v2, gỡ `novemberhomestay.com` khỏi Pages của repo cũ rồi gán vào Pages của repo mới. Bật **Enforce HTTPS** khi GitHub cho phép. Không gán cùng một tên miền vào hai repo cùng lúc.

Repo không tự gán tên miền hay thay đổi DNS. Nếu hai repo đều thuộc cùng tài khoản November và DNS hiện trỏ đúng GitHub Pages, thường không cần đổi DNS tại PA Vietnam. Có thể giữ repo v1 để quay lại khi cần.

Tham khảo: [Triển khai Vite lên GitHub Pages](https://vite.dev/guide/static-deploy#github-pages).

## Cấu trúc chính

- `src/main.ts`: khởi động và điều hướng theo URL.
- `src/data/catalog.json`: ảnh, tiện nghi, giá, địa chỉ của các phòng/chi nhánh.
- `src/features/catalog/`: danh sách phòng, bộ lọc, yêu thích, chi nhánh.
- `src/features/room/`: chi tiết, thư viện ảnh, chia sẻ và tin nhắn hỏi phòng.
- `src/features/availability/`: form tạo danh sách, mã hóa link và trang gửi khách.
- `src/features/reviews/`, `src/features/rules/`: đánh giá và nội quy.
- `src/i18n/`: giao diện Việt/Anh.
- `public/`: ảnh/logo và các đường dẫn chuyển hướng của v1.
- `scripts/check-assets.mjs`: kiểm tra tài nguyên cục bộ.
- `scripts/check-built-site.mjs`: kiểm tra tương tác và đường dẫn trên bản build.

Giữ nguyên mã phòng/chi nhánh khi chỉnh dữ liệu để các link chia sẻ còn đúng. Bảng mã phòng trong định dạng link là danh sách cố định: khi có phòng mới, bổ sung thay vì thay thứ tự hoặc tái sử dụng mã cũ.

## Tạo danh sách phòng trống

Mở **Tạo danh sách phòng trống** ở footer hoặc `index.html?page=availability`, nhập mật khẩu đã thống nhất, rồi:

1. Chọn Theo giờ / Qua đêm / Theo ngày / Loại khác; nhập ngày và giờ thực tế. Giờ mặc định của Qua đêm là 21:00–09:00, Theo ngày là 14:00–12:00; vẫn chỉnh được.
2. Kiểm tra số đêm tính giá hoặc số giờ gói cơ bản. Nhập extra nhận sớm/trả muộn nếu có. Extra không tự thay đổi giờ nhận/trả thực tế.
3. Nhập phụ thu chung gồm lý do và tỷ lệ phần trăm, áp dụng cho tất cả phòng. Các tỷ lệ cộng với nhau, không tính chồng.
4. Tích chọn phòng theo chi nhánh và nhập **tổng tiền cuối cùng đã gồm extra/phụ thu** theo đơn vị nghìn VND: `161` tương ứng `161.000 VND`. Số tiền đầy đủ hiện ngay dưới ô nhập. Website không cộng extra/phụ thu lần nữa.
5. Xem trước danh sách, sau đó bấm **Tạo link và sao chép**. Sửa thông tin thì cần xem trước lại trước khi tạo link mới.

Link khách có thời gian check-in/check-out in đậm, cách tính thu gọn, phụ thu chung và tổng tiền từng phòng. Loại khác không có dòng giá cơ bản; nếu không có extra thì ẩn phần cách tính. Tin nhắn hỏi phòng không kèm giá, giống trang phòng thông thường.

Dữ liệu được mã hóa trong link; không lưu danh sách vào database hay tạo thêm file trên hosting. Link là bản chụp ở thời điểm tạo, không tự cập nhật/giữ phòng/thu hồi. Tạo link mới không vô hiệu hóa link cũ. Khi giá hoặc phòng trống thay đổi, hãy gửi lại link mới và xác nhận với khách.

Mật khẩu của công cụ được kiểm tra trên trình duyệt, không phải cơ chế đăng nhập phía máy chủ. Giá và phòng trống vẫn do Nov xác nhận trực tiếp trước khi khách thanh toán.

## Nội dung và ngôn ngữ

VI/EN ở đầu trang đổi giao diện, được ghi nhớ trên trình duyệt và chia sẻ qua `?lang=en`. Tên riêng, địa chỉ và nội dung đánh giá giữ nguyên; khi thêm nội dung giao diện, cập nhật `src/i18n/translations.ts`.

Mục nhận xét dùng 10 bản tóm lược từ đánh giá 5 sao trên hồ sơ Airbnb của host AnhDuong, đối chiếu ngày 28/10/2026. Đây là đánh giá về host, không phải điểm tổng hợp riêng của từng chi nhánh. Không tự đồng bộ; không trình bày bản tóm lược thành trích dẫn nguyên văn. Nguồn được liên kết tại từng thẻ.

Ảnh, bảng giá, địa chỉ, số điện thoại, tài khoản mạng xã hội và chính sách cần được chủ homestay xác nhận khi thay đổi thông tin kinh doanh.
