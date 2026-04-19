# UX Sprint — Admin/HLV Phase 2.1

## Mục tiêu
Tối ưu điểm danh thủ công: mỗi võ sinh có 3 nút thao tác trực tiếp theo trạng thái.

## Đã triển khai
- Thay form nhập thủ công nhiều trường bằng 3 nút nhanh trên từng dòng võ sinh:
  - `Có mặt` (xanh)
  - `Vắng có phép` (vàng)
  - `Vắng không phép` (đỏ)
- Khi bấm nút `vắng`, hiển thị box nhập `lý do` trước khi gửi.
- Cập nhật trạng thái theo kiểu bất đồng bộ (AJAX), không reload trang.
- Backend bổ sung endpoint JSON: `POST /diem-danh/cap-nhat-json`.
- Nút của trạng thái hiện tại được tô màu đầy (`btn-*`), trạng thái khác ở dạng viền (`btn-outline-*`).
- Sau khi cập nhật: badge + lý do + số liệu summary được cập nhật tại chỗ.

## Files đã thay đổi
- [routes/diemDanh.js](routes/diemDanh.js)
- [views/diem-danh.ejs](views/diem-danh.ejs)

## Test nhanh
1. Vào `/diem-danh?buoi_hoc_id=<id>`.
2. Tại 1 võ sinh, bấm lần lượt 3 nút trạng thái.
3. Với 2 nút vắng, nhập lý do tại box popup và xác nhận.
4. Xác nhận badge trạng thái thay đổi đúng, lý do hiển thị đúng, toast hiển thị.
5. Xác nhận trang không bị nhảy lên đầu (không reload toàn trang).

## Ghi chú
- Cách làm ưu tiên tốc độ thao tác cho admin/HLV trong ca điểm danh thực tế.
- Trường lý do vắng chi tiết vẫn có thể mở rộng ở phase sau nếu cần form chi tiết theo modal.
