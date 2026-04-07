# UX Sprint — Admin/HLV Phase 6

## Mục tiêu
Hoàn thiện conflict guard cho luồng bulk điểm danh (không reload):
- Bulk update an toàn khi có thao tác đồng thời
- Không ghi đè dữ liệu mới hơn ngoài ý muốn
- Trả thống kê kết quả chi tiết

## Đã triển khai

### 1) Backend bulk JSON conflict-safe
- Thêm endpoint `POST /diem-danh/cap-nhat-nhanh-json`.
- Nhận dữ liệu:
  - `target_vo_sinh_ids[]`
  - `expected_versions{ vo_sinh_id: ngay_cap_nhat }`
  - `bulk_action`, `bulk_ly_do`, `buoi_hoc_id`
- Với từng võ sinh:
  - So sánh `expected_versions` với `ngay_cap_nhat` hiện tại
  - Nếu conflict -> không ghi, đưa vào danh sách conflict
  - Không conflict -> upsert thành công
- Trả về:
  - `stats.total`, `stats.updated`, `stats.conflicts`
  - `data.updated[]`, `data.conflicts[]`

### 2) Frontend bulk async không reload
- Form bulk ở trang điểm danh chạy AJAX thay vì submit redirect.
- Gửi kèm snapshot phiên bản hiện tại của từng dòng (`data-current-ngay-cap-nhat`).
- Sau phản hồi:
  - dòng cập nhật thành công: áp trạng thái mới
  - dòng conflict: áp snapshot mới nhất từ server
  - summary được tính lại trực tiếp trên UI
- Toast hiển thị tách biệt:
  - success cho số bản ghi cập nhật được
  - warning cho số bản ghi conflict

## Files đã thay đổi
- [routes/diemDanh.js](routes/diemDanh.js)
- [views/diem-danh.ejs](views/diem-danh.ejs)

## Test nhanh
1. Mở 2 tab cùng buổi học.
2. Tab A thao tác đổi trạng thái vài võ sinh.
3. Tab B bấm bulk update trên cùng danh sách.
4. Kỳ vọng:
   - Tab B không reload trang.
   - Dòng conflict không bị ghi đè.
   - Toast báo số cập nhật thành công và số conflict.
   - Summary cập nhật đúng theo trạng thái cuối cùng trên UI.
