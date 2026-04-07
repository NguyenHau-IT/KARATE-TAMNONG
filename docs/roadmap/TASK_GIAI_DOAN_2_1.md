# Task Giai đoạn 2.1 — Bắt buộc đổi mật khẩu lần đầu

## Mục tiêu
- Tăng an toàn cho luồng cấp tài khoản admin ở Giai đoạn 2.
- Account được cấp mật khẩu tạm phải đổi mật khẩu ngay sau lần đăng nhập đầu tiên.

## Phạm vi triển khai

### A. Database
- [x] Thêm cột `tai_khoan.must_change_password` (default `false`).
- [x] Thêm index hỗ trợ lọc.

File SQL: [sql/006_auth_first_password_phase21.sql](sql/006_auth_first_password_phase21.sql)

### B. Cấp tài khoản mới
- [x] Khi admin tạo account mới tại `/users`, tự đặt `must_change_password = true`.

File: [routes/users.js](routes/users.js)

### C. Auth flow
- [x] Thêm cờ `mustChangePassword` vào payload user.
- [x] Nếu cờ bật, chặn truy cập khu vực nghiệp vụ và chuyển hướng về `/auth/first-password`.
- [x] Thêm form đổi mật khẩu lần đầu (`GET/POST /auth/first-password`).
- [x] Sau khi đổi thành công: cập nhật hash + tắt cờ + revoke session + yêu cầu đăng nhập lại.

File: [routes/auth.js](routes/auth.js), [middlewares/auth.js](middlewares/auth.js), [services/authAccountService.js](services/authAccountService.js), [views/auth-first-password.ejs](views/auth-first-password.ejs)

---

## Test nhanh
1. Đăng nhập admin, tạo tài khoản mới ở `/users`.
2. Đăng nhập bằng account vừa tạo.
3. Xác nhận bị chuyển về `/auth/first-password`.
4. Thử truy cập route nghiệp vụ bất kỳ trước khi đổi mật khẩu -> phải bị chặn và chuyển về trang đổi mật khẩu.
5. Đổi mật khẩu thành công -> bị yêu cầu đăng nhập lại.
6. Đăng nhập bằng mật khẩu mới -> vào hệ thống bình thường.

---

## Ghi chú
- Mật khẩu mới tối thiểu 6 ký tự.
- Không cho đặt lại trùng mật khẩu tạm.
