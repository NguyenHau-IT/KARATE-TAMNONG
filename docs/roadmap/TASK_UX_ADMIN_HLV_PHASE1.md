# UX Sprint — Admin/HLV Phase 1

## Mục tiêu
Tối ưu UX cho role `admin`/`huan_luyen_vien` theo luồng chính:
- Buổi học -> Điểm danh -> Vắng mặt
- Giảm số lần chuyển trang thủ công
- Giảm lỗi thao tác trạng thái điểm danh

## Đã triển khai

### 1) Buổi học: thêm lối tắt xem vắng mặt theo buổi
- Trong bảng `/buoi-hoc`, mỗi dòng buổi học có thêm nút `Xem vắng mặt`.
- File: [views/buoi-hoc.ejs](views/buoi-hoc.ejs)

### 2) Điểm danh: điều hướng nhanh sang tab vắng mặt
- Ở header trang `/diem-danh`, khi đã chọn buổi học có nút `Mở tab vắng mặt`.
- File: [views/diem-danh.ejs](views/diem-danh.ejs)

### 3) Điểm danh: giảm lỗi nhập `loai_vang`
- Tự động disable `loai_vang` khi trạng thái là `co_mat`.
- Khi chuyển về `co_mat`, tự reset `loai_vang` về rỗng.
- File: [views/diem-danh.ejs](views/diem-danh.ejs)

### 4) Vắng mặt: quay lại điểm danh cùng buổi học
- Ở header `/vang-mat`, khi đã chọn buổi có nút `Quay lại điểm danh`.
- File: [views/vang-mat.ejs](views/vang-mat.ejs)

## Test nhanh
1. Vào `/buoi-hoc` -> bấm `Xem vắng mặt` tại 1 buổi.
2. Ở `/diem-danh?buoi_hoc_id=...` -> bấm `Mở tab vắng mặt`.
3. Trong form cập nhật điểm danh:
   - chọn `co_mat` -> `loai_vang` bị disable và reset.
   - chọn `vang` -> `loai_vang` được enable.
4. Ở `/vang-mat?buoi_hoc_id=...` -> bấm `Quay lại điểm danh` đúng buổi.

## Next (Phase 2 đề xuất)
- Bulk action điểm danh nhanh theo nhóm (có mặt tất cả / vắng tất cả).
- Sticky filter trạng thái + từ khóa theo session.
- Bổ sung toast thống nhất thay cho alert tĩnh.
