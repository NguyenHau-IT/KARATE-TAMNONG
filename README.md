# KARATE-TAMNONG

Hệ thống quản lý võ sinh và điểm danh theo hướng Express + EJS + Supabase.

## Luồng hiện tại
- Thao tác chính qua giao diện render view (không ưu tiên API JSON công khai cho 2 module mới).
- Module chính:
	- `/` Dashboard
	- `/bac-dai` Quản lý bậc đai
	- `/vo-sinh` Quản lý võ sinh
	- `/lop-vo` Quản lý lớp võ + gán võ sinh vào lớp
	- `/buoi-hoc` Quản lý buổi học (tạo/xóa)
	- `/diem-danh` Điểm danh theo buổi học
	- `/vang-mat` Tab vắng mặt theo buổi học

## Phân quyền đăng nhập (Production)
- Hệ thống hiện tại dùng **DB-backed auth** với bảng `tai_khoan` trên Supabase.
- Auth dùng JWT access token + refresh token cookie rotation, nguồn sự thật của user/role nằm trong DB.
- Cần chạy script: [sql/001_tai_khoan_auth.sql](sql/001_tai_khoan_auth.sql)
- Cần chạy thêm script: [sql/002_auth_session_refresh.sql](sql/002_auth_session_refresh.sql)

Seed mặc định sau khi chạy SQL:
- `admin / admin123` → `admin`
- `hlv / hlv123` → `huan_luyen_vien`
- `vosinh1 / vs123` → `vo_sinh` (chỉ được seed khi có `vo_sinh.id = 1`)

Biến môi trường liên quan:
- `AUTH_JWT_SECRET`
- `AUTH_COOKIE_NAME`
- `AUTH_ACCESS_COOKIE_NAME`
- `AUTH_REFRESH_COOKIE_NAME`
- `AUTH_ACCESS_TOKEN_MINUTES`
- `AUTH_REFRESH_TOKEN_DAYS`
- `AUTH_JWT_ACTIVE_KID` (optional)
- `AUTH_JWT_SECRETS_JSON` (optional, dùng cho rotate secret)

### Khởi tạo nhanh auth production
1. Mở Supabase SQL Editor.
2. Chạy file [sql/001_tai_khoan_auth.sql](sql/001_tai_khoan_auth.sql).
3. Chạy tiếp file [sql/002_auth_session_refresh.sql](sql/002_auth_session_refresh.sql).
4. Khởi động lại server.
5. Đăng nhập bằng tài khoản seed ở trên và đổi mật khẩu ngay sau khi vào hệ thống.

### Flow token hiện tại
- Login: tạo access token (ngắn hạn) + refresh token (dài hạn).
- Mỗi lần refresh: tạo refresh token mới và revoke token cũ (rotation).
- Nếu refresh token bị dùng lại sau khi đã rotate: toàn bộ session của tài khoản sẽ bị revoke.
- Chi tiết cơ chế bảo mật token: [AUTH_TOKEN_SECURITY.md](AUTH_TOKEN_SECURITY.md)

## Chạy dự án
1. Cài Node.js LTS
2. Cài thư viện: `npm install`
3. Tạo file `.env` theo [.env.example](.env.example)
4. Chạy dev: `npm run dev`

## Quy trình phát triển kèm kiểm thử (bắt buộc)
Mỗi tính năng mới phải đi theo chu kỳ sau:
1. **Phân tích yêu cầu + tiêu chí Done**
2. **Viết/điều chỉnh mã**
3. **Kiểm thử ngay trong vòng phát triển**
	- Test luồng chính (happy path)
	- Test lỗi validate/nghiệp vụ
	- Test hồi quy luồng cũ bị ảnh hưởng
4. **Cập nhật tài liệu liên quan**
5. **Chỉ chốt khi đã pass checklist test**

Checklist nhanh trước commit:
- [ ] Không lỗi runtime/lint ở phần đã sửa
- [ ] Pass smoke test tính năng vừa làm
- [ ] Luồng cũ quan trọng vẫn chạy
- [ ] Tài liệu đã đồng bộ

## Tài liệu liên quan
- [AUTH_TOKEN_SECURITY.md](AUTH_TOKEN_SECURITY.md)
- [DB_CONVENTION.md](DB_CONVENTION.md)
- [MA_TRAN_DB_API_MVP.md](MA_TRAN_DB_API_MVP.md)
- [MODULE_BUOI_HOC.md](MODULE_BUOI_HOC.md)
- [MODULE_DIEM_DANH.md](MODULE_DIEM_DANH.md)
- [QUY_TRINH_DEV_TEST.md](QUY_TRINH_DEV_TEST.md)
- [RESPONSE_MAU_JSON.md](RESPONSE_MAU_JSON.md)
- [TEST_API_KICH_BAN.md](TEST_API_KICH_BAN.md)
- [TEST_MANUAL_AUTH_TOKEN.md](TEST_MANUAL_AUTH_TOKEN.md)
