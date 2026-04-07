# AUTH TOKEN SECURITY (Production)

## Mục tiêu
Tài liệu này mô tả cơ chế bảo mật phiên đăng nhập hiện tại:
- Access token ngắn hạn
- Refresh token dài hạn
- Rotation cho refresh token
- Key rotation cho JWT secret

## Thành phần chính
- Bảng tài khoản: `tai_khoan` (xem [sql/001_tai_khoan_auth.sql](sql/001_tai_khoan_auth.sql))
- Bảng phiên refresh: `auth_session` (xem [sql/002_auth_session_refresh.sql](sql/002_auth_session_refresh.sql))
- Bảng nhật ký bảo mật: `auth_audit_log` (xem [sql/003_auth_audit_log.sql](sql/003_auth_audit_log.sql))
- Cookie access token: `AUTH_ACCESS_COOKIE_NAME` (mặc định `karate_auth`)
- Cookie refresh token: `AUTH_REFRESH_COOKIE_NAME` (mặc định `karate_refresh`)

## Luồng đăng nhập
1. User gửi username/password vào `POST /auth/login`.
2. Server kiểm tra `tai_khoan` + `bcrypt` hash.
3. Nếu hợp lệ:
   - Tạo access token JWT (TTL ngắn, mặc định 15 phút)
   - Tạo refresh token random
   - Lưu hash refresh token vào `auth_session`
   - Set 2 cookie `httpOnly`, `sameSite=lax`, `secure` ở production

## Luồng refresh
Có 2 cách:
- Tự động: middleware thử refresh khi access token hết hạn.
- Chủ động: gọi `POST /auth/refresh`.

Khi refresh hợp lệ:
1. Tìm session theo `sha256(refresh_token)`.
2. Kiểm tra chưa revoke, chưa hết hạn, account còn active.
3. Tạo refresh token mới.
4. Tạo session mới và revoke session cũ (rotation).
5. Phát hành access token mới + set lại cookie.

## Chống reuse refresh token
Nếu phát hiện refresh token đã revoke/hết hạn hoặc không còn hợp lệ:
- Thu hồi toàn bộ session của tài khoản tương ứng.
- Xóa cookie auth phía client.

## Quản trị phiên đăng nhập
- Màn hình: `/auth/sessions`
- Chức năng:
   - Xem danh sách thiết bị/phiên đang hoạt động.
   - Thu hồi từng phiên đăng nhập.
- Có giới hạn số phiên hoạt động tối đa mỗi tài khoản qua biến `AUTH_MAX_ACTIVE_SESSIONS`.

## Security audit log
Hệ thống ghi nhật ký các sự kiện chính:
- `login_success`, `login_failed`
- `refresh_success`, `refresh_failed`
- `token_reuse_detected`
- `logout`
- `session_revoke`

Thông tin log gồm: tài khoản, loại sự kiện, trạng thái, chi tiết, IP, user-agent, metadata.

## JWT key rotation (theo `kid`)
- Access token được ký với secret active có `kid` tương ứng.
- Verify token theo `kid` trong header.
- Cho phép duy trì nhiều key song song trong giai đoạn chuyển đổi.

Biến môi trường:
- `AUTH_JWT_ACTIVE_KID`: key đang dùng để ký token mới.
- `AUTH_JWT_SECRETS_JSON`: map key id -> secret.

Ví dụ:
- Giai đoạn thường: chỉ có `v2` là active.
- Giai đoạn chuyển: giữ `v1` để verify token cũ, ký token mới bằng `v2`.
- Kết thúc chuyển: xóa `v1` sau khi hết thời gian grace.

## Cấu hình khuyến nghị
- `AUTH_ACCESS_TOKEN_MINUTES=15`
- `AUTH_REFRESH_TOKEN_DAYS=7`
- `AUTH_MAX_ACTIVE_SESSIONS=5`
- Secret mạnh, ngẫu nhiên, không commit git.
- Bật HTTPS ở production để cookie `secure` hoạt động đúng.

## Checklist vận hành
1. Chạy SQL: [sql/001_tai_khoan_auth.sql](sql/001_tai_khoan_auth.sql), [sql/002_auth_session_refresh.sql](sql/002_auth_session_refresh.sql), [sql/003_auth_audit_log.sql](sql/003_auth_audit_log.sql).
2. Set đủ biến trong `.env` theo [.env.example](.env.example).
3. Restart app sau khi thay đổi secret hoặc policy token.
4. Rotate secret theo đợt có grace period.
5. Theo dõi login lỗi bất thường và số lần refresh thất bại.
