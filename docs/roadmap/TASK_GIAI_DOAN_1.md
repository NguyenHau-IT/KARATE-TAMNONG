# Task Giai đoạn 1 — Chuẩn hóa định danh user (MVP)

## Mục tiêu
- Chuẩn hóa định danh võ sinh để giảm trùng thông tin cá nhân.
- Tạo nền tảng cho luồng admin cấp tài khoản đồng bộ profile ở giai đoạn sau.

## Task checklist

### A. Database
- [x] Thêm cột `ma_vo_sinh` vào `vo_sinh`.
- [x] Thêm cột `khoa_nhap_hoc` vào `vo_sinh`.
- [x] Backfill dữ liệu cũ cho `ma_vo_sinh` và `khoa_nhap_hoc`.
- [x] Thêm unique index cho `ma_vo_sinh`.
- [x] Thêm check constraint format mã `Kyy-xxxxx`.

SQL triển khai: [sql/004_ma_vo_sinh_phase1.sql](sql/004_ma_vo_sinh_phase1.sql)

### B. Backend
- [x] Bổ sung normalize/validate `ma_vo_sinh`, `khoa_nhap_hoc` ở module võ sinh.
- [x] Tự sinh mã `ma_vo_sinh` nếu người dùng không nhập.
- [x] Bổ sung hỗ trợ import CSV với cột `ma_vo_sinh`, `khoa_nhap_hoc`.

File chính: [routes/voSinh.js](routes/voSinh.js)

### C. Frontend
- [x] Thêm input `Mã võ sinh` vào form võ sinh.
- [x] Thêm input `Khóa nhập học` vào form võ sinh.
- [x] Hiển thị cột `Mã võ sinh` trong bảng danh sách.

File chính: [views/vo-sinh.ejs](views/vo-sinh.ejs), [public/javascripts/vo-sinh.js](public/javascripts/vo-sinh.js)

### D. Dữ liệu mẫu
- [x] Cập nhật file CSV mẫu theo chuẩn mới.

File: [SAMPLE_VO_SINH_IMPORT.csv](../../tests/fixtures/SAMPLE_VO_SINH_IMPORT.csv)

---

## Cách test nhanh
1. Chạy SQL: [sql/004_ma_vo_sinh_phase1.sql](sql/004_ma_vo_sinh_phase1.sql).
2. Vào màn hình [views/vo-sinh.ejs](views/vo-sinh.ejs) qua route `/vo-sinh`.
3. Tạo mới võ sinh:
   - Case A: để trống `ma_vo_sinh` → hệ thống tự sinh.
   - Case B: nhập sai format mã → hệ thống báo lỗi.
4. Import CSV bằng [SAMPLE_VO_SINH_IMPORT.csv](../../tests/fixtures/SAMPLE_VO_SINH_IMPORT.csv).
5. Kiểm tra danh sách hiển thị cột mã võ sinh đúng.
