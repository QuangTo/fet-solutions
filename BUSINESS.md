# FET - Tổng hợp nghiệp vụ

## Mục tiêu

FET là SaaS nhỏ cho doanh nghiệp vận tải quản lý hàng nhận từ khách hàng, nhập kho, xuất hàng lên xe và đối soát điều kiện chốt hóa đơn. Excel vẫn nên được hỗ trợ ở dạng nhập/xuất dữ liệu, nhưng nguồn dữ liệu chuẩn nên nằm trong hệ thống.

## Vai trò

- Thủ kho: nhập hàng và lập chuyến xuất hàng.
- Admin: quản lý khách hàng, xe, tài xế, tài khoản và cài đặt hệ thống.
- Kế toán: xem tồn, lịch sử xuất hàng và trạng thái chốt hóa đơn theo khách hàng.
- Lái xe: xem chuyến xe, tổng số lượng và danh sách hàng trên xe.

## Luồng nghiệp vụ chính

1. Khách hàng bàn giao nhiều loại hàng cho kho, mỗi loại có số lượng, đơn vị và ngày nhập.
2. Thủ kho chọn khách hàng, loại hàng, xe, tài xế và số lượng để xuất hàng lên xe.
3. Hệ thống tự trừ tồn kho theo cặp khách hàng + loại hàng.
4. Kế toán lọc theo khách hàng để xem hàng đã xuất hết chưa. Khi tồn còn lại bằng 0, trạng thái chuyển sang hoàn tất.

## Màn hình hiện tại

- Tổng quan: xem chỉ số chính, danh sách khách hàng đang có hàng trong kho và biểu đồ xu hướng tồn kho trong tháng.
- Nhập hàng: lọc theo khách hàng, ghi nhận nhiều loại hàng, xem tổng hợp theo loại hàng/số lượng/đơn vị và xem lịch sử từng lần nhập.
- Xuất hàng: bắt buộc chọn khách hàng, xe, tài xế, loại hàng và số lượng; xe/tài xế lấy từ dữ liệu quản lý; số lượng mặc định bằng số lượng tồn tối đa của loại hàng đang chọn.
- Báo cáo: kế toán xem các khách hàng đã xuất hết hàng, xác nhận xuất hóa đơn qua dialog, xem lịch sử xuất hàng và lịch sử xuất hóa đơn.
- Cài đặt: đổi chế độ sáng/tối, màu nền, tông màu chủ đạo và cỡ chữ toàn hệ thống.
- Quản lý: thêm/sửa/xóa thông tin khách hàng, xe và tài xế.

## Dữ liệu đề xuất

- customers: thông tin khách hàng.
- vehicles: biển số xe và thông tin xe.
- drivers: thông tin tài xế.
- receipts: đợt nhập hàng từ khách hàng.
- receipt_items: loại hàng, số lượng, đơn vị, ngày nhập.
- dispatches: chuyến xuất hàng gồm khách hàng, xe, tài xế, thủ kho, ngày xuất.
- dispatch_items: loại hàng và số lượng xuất.
- invoice_approvals: lịch sử kế toán xác nhận xuất hóa đơn theo khách hàng, ngày và trạng thái.
- audit_logs: lịch sử thao tác của người dùng.

## Hướng phát triển

- Import Excel theo template, có bước xem trước lỗi trước khi lưu.
- Export báo cáo Excel/PDF cho kế toán.
- Thêm xác nhận của tài xế trên mobile.
- Thêm ảnh/chứng từ đính kèm cho từng chuyến.
- Thêm phân quyền backend thật thay cho phân quyền thử nghiệm phía giao diện.
