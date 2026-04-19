# UX Sprint — Admin/HLV Phase 2

## Mục tiêu
Tăng tốc thao tác điểm danh cho `admin`/`huan_luyen_vien` ở trang `/diem-danh`:
- Cập nhật hàng loạt theo bộ lọc hiện tại
- Giữ bộ lọc ổn định theo từng buổi học
- Thống nhất thông báo bằng toast

## Đã triển khai

### 1) Bulk action điểm danh
- Thêm form `Cập nhật nhanh theo bộ lọc hiện tại`.
- Hỗ trợ 3 thao tác:
  - Đánh dấu tất cả là Có mặt
  - Đánh dấu tất cả là Vắng có phép
  - Đánh dấu tất cả là Vắng không phép
- Có trường lý do dùng cho trạng thái vắng.
- Backend mới: `POST /diem-danh/cap-nhat-nhanh`.

### 2) Sticky filter theo buổi học
- Lưu bộ lọc `q`, `trang_thai`, `loai_vang` vào `localStorage` theo key buổi học.
- Khi quay lại cùng buổi học, tự điền lại filter nếu URL chưa có query filter.
- Nút `Xóa lọc` đồng thời xóa dữ liệu filter đã lưu.

### 3) Toast thống nhất thay alert tĩnh
- Chuyển thông báo `message/error` sang toast (SweetAlert2) ở góc phải trên.
- Không còn hiển thị block alert tĩnh ở đầu trang `/diem-danh`.

## Files đã thay đổi
- [routes/diemDanh.js](routes/diemDanh.js)
- [views/diem-danh.ejs](views/diem-danh.ejs)

## Test nhanh
1. Vào `/diem-danh?buoi_hoc_id=<id>`.
2. Chọn bộ lọc bất kỳ, bấm `Lọc`, sau đó F5/truy cập lại cùng buổi -> filter được giữ.
3. Chọn bulk action `Có mặt` -> nhận toast success, số liệu cập nhật.
4. Chọn bulk action `Vắng có phép` + nhập lý do -> nhận toast success, lý do được áp dụng.
5. Bấm `Xóa lọc` -> bộ lọc URL sạch và localStorage buổi học được xóa.
6. Thử gửi thiếu thông tin (hoặc buổi không tồn tại) -> nhận toast error.

## Ghi chú kỹ thuật
- Ưu tiên `upsert` theo `onConflict: buoi_hoc_id,vo_sinh_id`.
- Có fallback cập nhật/insert tuần tự nếu DB chưa có unique index phục vụ upsert conflict target (`42P10`).
