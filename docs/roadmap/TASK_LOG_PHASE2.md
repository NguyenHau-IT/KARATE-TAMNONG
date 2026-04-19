# Logging Phase 2 — Mở rộng observability cho luồng view-first

## Mục tiêu
Mở rộng logging từ async JSON sang các flow view-first mà admin/HLV vẫn dùng hằng ngày:
- Tải màn hình điểm danh
- Cập nhật từng dòng qua form submit (redirect)
- Bulk cập nhật qua form submit (redirect)

## Đã triển khai

### 1) Log cho tải màn hình `/diem-danh` (GET)
- Action: `view_load`
- Trạng thái ghi nhận:
  - `started`
  - `not_found` (khi `buoi_hoc_id` không tồn tại)
  - `succeeded`
  - `failed`
- Meta chính: `selectedBuoiHocId`, `hasFilters`, `renderedRows`, `tongVoSinh`, `durationMs`.

### 2) Log cho cập nhật từng dòng dạng form `/diem-danh/cap-nhat`
- Action: `single_update_form`
- Trạng thái ghi nhận:
  - `started`
  - `validation_failed`
  - `succeeded` (`mode: update|insert`)
  - `failed`
- Meta chính: `buoiHocId`, `voSinhId`, `stage`, `durationMs`, `errorCode`.

### 3) Log cho bulk dạng form `/diem-danh/cap-nhat-nhanh`
- Action: `bulk_update_form`
- Trạng thái ghi nhận:
  - `started`
  - `validation_failed`
  - `succeeded`
  - `failed`
- Meta chính: `buoiHocId`, `action`, `hasFilters`, `updated`, `durationMs`, `errorCode`.

## File thay đổi
- [routes/diemDanh.js](../../routes/diemDanh.js)

## Cách quan sát nhanh
1. Mở `/diem-danh?buoi_hoc_id=<id>` và thao tác như bình thường.
2. Quan sát terminal để thấy các log JSON mới (`view_load`, `single_update_form`, `bulk_update_form`).
3. Nếu user báo lỗi redirect bất thường, dùng `x-request-id` để truy vết request tương ứng.

## Rollback
- Revert file [routes/diemDanh.js](../../routes/diemDanh.js) để quay lại trạng thái cuối Phase 1.
