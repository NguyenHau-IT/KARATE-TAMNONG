# Triển khai Đề xuất 4 — Khóa ràng buộc DB cốt lõi

## Mục tiêu
- Khóa rule nghiệp vụ ở tầng DB để tránh sai dữ liệu khi concurrent request hoặc ghi dữ liệu ngoài app.
- Đảm bảo các quy tắc cốt lõi luôn được enforce bằng constraint/index.

## Cách triển khai an toàn
1. Chạy precheck dữ liệu bẩn/trùng.
2. Làm sạch dữ liệu nếu precheck có dòng vi phạm.
3. Chạy migration khóa ràng buộc.
4. Nếu cần rollback: chạy file rollback tương ứng.

## File SQL
- Precheck: [sql/007_precheck_du_lieu_de_xuat_4.sql](sql/007_precheck_du_lieu_de_xuat_4.sql)
- Migration: [sql/008_khoa_rang_buoc_de_xuat_4.sql](sql/008_khoa_rang_buoc_de_xuat_4.sql)
- Rollback: [sql/rollback/008_khoa_rang_buoc_de_xuat_4_rollback.sql](../../sql/rollback/008_khoa_rang_buoc_de_xuat_4_rollback.sql)

## Những gì được khóa
- `UNIQUE (buoi_hoc_id, vo_sinh_id)` trên `diem_danh`.
- Index truy vấn cho `diem_danh(buoi_hoc_id)`, `diem_danh(vo_sinh_id)`, `diem_danh(trang_thai_diem_danh)`.
- Check constraint:
  - `trang_thai_diem_danh` chỉ nhận `co_mat|vang`.
  - Rule `loai_vang` theo trạng thái:
    - `co_mat` => `loai_vang` phải null
    - `vang` => `loai_vang` phải thuộc `co_phep|khong_phep`

## Test nhanh sau migration
1. Thử insert trùng `buoi_hoc_id + vo_sinh_id` -> phải fail.
2. Thử insert `co_mat` nhưng có `loai_vang` -> phải fail.
3. Thử insert `vang` nhưng thiếu `loai_vang` -> phải fail.
4. Chạy lại luồng điểm danh hiện tại để xác nhận không regress.
