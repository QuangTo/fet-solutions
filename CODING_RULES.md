# FES - Quy tắc viết mã

## Nguyên tắc chung

- Ưu tiên code dễ đọc, tên hàm bám sát nghiệp vụ.
- Không dùng Excel làm nguồn dữ liệu chính; Excel chỉ là kênh nhập/xuất.
- Tồn kho phải được tính từ dữ liệu nhập hàng và xuất hàng, không sửa số tồn thủ công.
- Các thao tác ghi dữ liệu cần có thông tin người thực hiện để phục vụ đối soát.

## Giao diện

- Giao diện phải responsive cho thủ kho và lái xe dùng trên điện thoại.
- Wording hiển thị cho người dùng dùng tiếng Việt thống nhất.
- Các danh mục dùng chung như khách hàng, xe, tài xế phải được chọn từ dữ liệu quản lý.
- Form số lượng phải kiểm tra số lượng lớn hơn 0 và không vượt tồn kho khả dụng.
- Các trạng thái quan trọng cần có màu rõ ràng, ví dụ hoàn tất màu xanh, đang xử lý màu vàng.
- Button chính và button thao tác phải dùng biến `--accent`, `--accent-strong` hoặc `--accent-soft` để luôn đổi theo Cài đặt > Tông màu.
- Date input phải mở picker khi click vào toàn bộ field, không chỉ khi click icon lịch.

## Table và phân trang

- Mọi table nghiệp vụ phải có pagination khi dữ liệu dài.
- Số dòng tối đa mỗi trang là 10, trừ riêng danh sách card khách hàng ở trang Tổng quan.
- Logic phân trang dùng helper chung trong `components/fet/app-shell.jsx` hoặc tách ra module dùng chung khi tái sử dụng nhiều nơi.
- Empty state phải có câu rõ ràng để người dùng biết cần chọn khách hàng, đổi filter hoặc chưa có dữ liệu.

## Spacing và layout

- Page dùng `.single-column` hoặc grid riêng của page, khoảng cách section chuẩn là 16px.
- Panel dùng padding 20px, card item dùng padding 16px, item nhỏ trong danh mục dùng padding 12px.
- Border radius mặc định: panel/card 14px, input/button 10px, button nhỏ 6px.
- Không lồng card trong card. Section lớn là panel; item lặp lại bên trong mới là card.
- Mobile dưới 680px phải collapse form/grid về 1 cột.

## Cấu trúc frontend

- App dùng Next.js App Router trong `app/`; không thêm lại Vite, `index.html` tĩnh hoặc `public/pages/*.html`.
- Các route như `/receipt`, `/dispatch`, `/management`, `/reports`, `/settings` nằm trong `app/<route>/page.jsx`.
- Shared logistics shell và page UI nằm trong `components/fet/`; primitives nằm trong `components/ui/`.
- CSS entry là `app/globals.css`.
- Khi thêm page lớn, dùng lazy loading kèm skeleton.
- Dev/build dùng `next dev` và `next build`.

## Logic nghiệp vụ

- Vai trò chuẩn là `driver`, `warehouse`, `accountant`, `admin`.
- Quyền truy cập: driver và warehouse vào Tổng quan/Nhập hàng/Xuất hàng; accountant vào Tổng quan/Báo cáo; admin vào tất cả (gồm Quản lý và Cài đặt).
- Xuất hàng luôn gắn với khách hàng, loại hàng, xe, tài xế và thủ kho.
- Tồn kho được trừ theo cặp khách hàng + loại hàng.
- Báo cáo kế toán lọc theo khách hàng và hiển thị lịch sử xuất hàng đầy đủ.
- Khi một khách hàng không còn tồn kho, trạng thái chốt hóa đơn là hoàn tất.
- Khi kế toán xác nhận xuất hóa đơn, cần có dialog xác nhận trước khi ghi nhận.

## Backend

- API REST chạy bằng Next.js Route Handlers trong `app/api/`.
- Endpoint ghi dữ liệu phải validate body bằng schema trong `lib/server/validators.js`.
- Backend phải kiểm tra quyền theo vai trò, không chỉ dựa vào giao diện.
- Dùng PostgreSQL và migration cho production.
- Dùng numeric/decimal cho số lượng nếu có đơn vị tấn, kg, cuộn, thùng.

## Kiểm thử

- Unit test cho tính tồn kho và trạng thái chốt hóa đơn.
- Unit test cho lọc xuất hàng theo khách hàng.
- Integration test cho tạo nhập hàng, tạo chuyến xuất và xem báo cáo kế toán.
- E2E test cho luồng: nhập hàng, xuất nhiều chuyến, báo cáo chuyển sang hoàn tất.

## Delivery

- Commit nhỏ theo từng tính năng.
- Không commit dữ liệu thật của khách hàng.
- Không commit secrets hoặc database dump.
- Khi đổi UI, nên kèm ảnh màn hình hoặc mô tả rõ phần đã thay đổi.
