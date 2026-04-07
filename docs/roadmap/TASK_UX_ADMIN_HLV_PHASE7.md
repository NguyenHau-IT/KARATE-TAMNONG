# UX Sprint — Admin/HLV Phase 7

## Mục tiêu
Bổ sung cơ chế `Undo 5 giây` cho bulk điểm danh, vẫn đảm bảo conflict-safe.

## Đã triển khai

### 1) Endpoint hoàn tác bulk
- Thêm endpoint `POST /diem-danh/cap-nhat-restore-json` tại [routes/diemDanh.js](routes/diemDanh.js).
- Nhận payload:
  - `buoi_hoc_id`
  - `restore_rows[]` gồm trạng thái cần khôi phục và `expected_ngay_cap_nhat`
- Với từng dòng:
  - kiểm tra conflict theo `ngay_cap_nhat`
  - nếu conflict: không ghi đè, trả snapshot mới nhất
  - nếu không conflict: khôi phục trạng thái cũ
  - nếu trạng thái cũ là rỗng: xóa bản ghi điểm danh để về "chưa cập nhật"

### 2) Undo flow ở UI
- Trước khi bulk update, client chụp snapshot trạng thái toàn bảng.
- Sau bulk thành công, hiện hộp thoại `Hoàn tác trong 5 giây`.
- Nếu chọn hoàn tác:
  - gửi snapshot về endpoint restore
  - áp lại trạng thái cập nhật/ conflict lên từng dòng
  - tính lại summary ngay trên UI

### 3) Tính nhất quán dữ liệu
- Không undo mù: chỉ undo khi version kỳ vọng còn khớp.
- Nếu có thao tác mới xen giữa, dòng đó sẽ vào conflict thay vì bị ghi đè.

## Files đã thay đổi
- [routes/diemDanh.js](routes/diemDanh.js)
- [views/diem-danh.ejs](views/diem-danh.ejs)

## Test nhanh
1. Bulk update một loạt võ sinh.
2. Chọn `Hoàn tác` trong 5 giây.
3. Xác nhận trạng thái quay về trước bulk và summary cập nhật đúng.
4. Mở 2 tab, tạo thay đổi xen giữa rồi undo ở tab còn lại.
5. Xác nhận dòng conflict không bị ghi đè và có cảnh báo.
