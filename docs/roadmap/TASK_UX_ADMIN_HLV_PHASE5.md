# UX Sprint — Admin/HLV Phase 5

## Mục tiêu
Giảm rủi ro ghi đè trạng thái khi nhiều thao tác cùng lúc (multi-tab / multi-user):
- Thêm conflict guard nhẹ dựa trên `ngay_cap_nhat`
- Đồng bộ lại UI theo trạng thái mới nhất từ server khi có xung đột

## Đã triển khai

### 1) Concurrency token ở client
- Mỗi dòng võ sinh giữ `data-current-ngay-cap-nhat`.
- Khi gửi cập nhật async, client truyền thêm `expected_ngay_cap_nhat`.

### 2) Conflict guard ở server
- Endpoint [routes/diemDanh.js](routes/diemDanh.js) `POST /diem-danh/cap-nhat-json` so sánh:
  - `expected_ngay_cap_nhat` từ client
  - `ngay_cap_nhat` hiện tại trong DB
- Nếu lệch phiên bản: trả `409` với `code=attendance_conflict` + snapshot dữ liệu mới nhất.

### 3) Auto reconcile ở UI
- Nếu gặp conflict:
  - rollback optimistic state
  - áp snapshot mới nhất từ server vào đúng dòng (badge, lý do, nút, token thời gian)
  - cập nhật lại summary đúng theo trạng thái server
  - hiển thị toast cảnh báo

## Files đã thay đổi
- [routes/diemDanh.js](routes/diemDanh.js)
- [views/diem-danh.ejs](views/diem-danh.ejs)

## Test nhanh
1. Mở 2 tab cùng buổi học.
2. Tab A đổi trạng thái một võ sinh.
3. Tab B (chưa refresh) đổi trạng thái cùng võ sinh.
4. Kỳ vọng tab B nhận cảnh báo conflict và UI tự đồng bộ về dữ liệu mới nhất.

## Rollback
- Nếu cần rollback nhanh: chỉ cần revert thay đổi tại 2 file trên, luồng async vẫn hoạt động như Phase 4 (không conflict guard).
