# Task Giai đoạn 2 — Admin cấp tài khoản cơ bản

## Mục tiêu
- Triển khai luồng admin cấp tài khoản cho `huan_luyen_vien` và `vo_sinh`.
- Đồng bộ tài khoản võ sinh với hồ sơ cá nhân qua liên kết `vo_sinh_id`.
- Giảm thao tác thủ công và tránh cấp trùng tài khoản cho cùng một võ sinh.

## Phạm vi thực hiện

### A. Backend route quản lý tài khoản
- [x] Thay thế route `/users` từ placeholder thành module quản trị tài khoản.
- [x] Trang danh sách tài khoản + trạng thái active.
- [x] Form tạo tài khoản mới cho `huan_luyen_vien` và `vo_sinh`.
- [x] Validate username, mật khẩu tạm, role.
- [x] Kiểm tra username trùng.
- [x] Kiểm tra hồ sơ võ sinh đã có tài khoản hay chưa trước khi cấp.
- [x] Hash mật khẩu bằng `bcryptjs` trước khi lưu DB.
- [x] Thêm thao tác khóa/mở khóa tài khoản.

File chính: [routes/users.js](routes/users.js)

### B. UI admin
- [x] Tạo view quản lý tài khoản.
- [x] Thêm điều kiện hiển thị chọn hồ sơ võ sinh khi role là `vo_sinh`.
- [x] Hiển thị liên kết mã/họ tên võ sinh trong bảng account.

File: [views/users.ejs](views/users.ejs)

### C. Điều hướng
- [x] Thêm tab `Tài khoản` chỉ cho role `admin` ở navbar.

File: [views/partials/header.ejs](views/partials/header.ejs)

### D. Database constraint phase 2
- [x] SQL unique index cho `tai_khoan.vo_sinh_id` (không null) để chặn 1 hồ sơ nhiều account.

File: [sql/005_tai_khoan_phase2.sql](sql/005_tai_khoan_phase2.sql)

---

## Cách test nhanh
1. Đăng nhập role `admin`.
2. Vào `/users`.
3. Tạo tài khoản `huan_luyen_vien` mới (không cần chọn hồ sơ võ sinh).
4. Tạo tài khoản `vo_sinh` mới (bắt buộc chọn hồ sơ võ sinh).
5. Thử tạo tài khoản thứ 2 cho cùng hồ sơ võ sinh -> phải bị chặn.
6. Thử khóa/mở khóa tài khoản bất kỳ (trừ admin gốc).

---

## Ghi chú
- Giai đoạn này tập trung luồng cấp tài khoản cơ bản, chưa bao gồm bắt buộc đổi mật khẩu lần đầu.
- Ở giai đoạn tiếp theo có thể bổ sung workflow đổi mật khẩu lần đầu và dashboard theo ngoại lệ.
