# Test thủ công tính năng Auth Token (pre-commit)

## 1) Mục tiêu
Xác nhận cơ chế:
- Login tạo access + refresh cookie
- Refresh hoạt động và có rotation
- Reuse token cũ bị chặn
- Phân quyền route theo role vẫn đúng
- Logout thu hồi phiên

## 2) Điều kiện trước khi test
1. Đã chạy SQL:
   - [sql/001_tai_khoan_auth.sql](sql/001_tai_khoan_auth.sql)
   - [sql/002_auth_session_refresh.sql](sql/002_auth_session_refresh.sql)
2. `.env` có đủ biến auth theo [.env.example](.env.example).
3. Server đang chạy.
4. Có account seed hợp lệ (`admin`, `hlv`, `vosinh1`).

## 3) Kịch bản test bắt buộc

### Case A — Login thành công
- Bước:
  1. Mở `/auth/login`.
  2. Đăng nhập bằng `admin/admin123`.
- Kỳ vọng:
  - Redirect về `/`.
  - Trong browser có 2 cookie: access + refresh.
  - Không báo lỗi.

### Case B — Sai mật khẩu
- Bước:
  1. Đăng nhập `admin/sai_mat_khau`.
- Kỳ vọng:
  - Ở lại trang login.
  - Có thông báo “Tài khoản hoặc mật khẩu không đúng”.
  - Không tạo cookie đăng nhập mới.

### Case C — Phân quyền route
- Bước:
  1. Login `vosinh1/vs123`.
  2. Truy cập `/check-in`.
  3. Truy cập `/buoi-hoc`.
- Kỳ vọng:
  - `/check-in`: vào được.
  - `/buoi-hoc`: 403 (không đủ quyền).

### Case D — Refresh thủ công
- Bước:
  1. Login thành công.
  2. Gọi `POST /auth/refresh`.
- Kỳ vọng:
  - Response JSON `{ ok: true }`.
  - Cookie refresh được cấp lại (rotation).

### Case E — Reuse refresh token cũ (bắt buộc)
- Bước:
  1. Login và lưu refresh token cũ.
  2. Gọi `POST /auth/refresh` 1 lần để lấy refresh token mới.
  3. Dùng lại refresh token cũ gọi `POST /auth/refresh`.
- Kỳ vọng:
  - Request dùng token cũ bị chặn (ưu tiên thấy mã gốc `401` trên API refresh).
  - Cookie auth bị xóa.
  - Các request protected sau đó bị redirect login.

> Ghi chú pass thực tế: nếu kiểm tra qua flow UI có redirect, có thể thấy response cuối là `200` kèm thông báo "vui lòng đăng nhập lại". Trường hợp này vẫn **PASS** nếu cookie đã bị xóa và không còn truy cập route protected.

#### Lưu ý khi thấy mã `304`
- `304 Not Modified` thường là phản hồi cache của trình duyệt, **không phải** kết quả logic của `POST /auth/refresh`.
- Với Case E, cần kiểm tra đúng request sau trong Network:
  - Method: `POST`
  - URL: `/auth/refresh`
  - Kết quả hợp lệ mong đợi: lần 1 `200`, lần reuse token cũ `401`.
- Nếu vẫn thấy `304`, hãy:
  1. Bật **Disable cache** trong DevTools.
  2. Lọc Network theo `fetch/xhr` để tránh nhìn nhầm request HTML/CSS.
  3. Xác nhận không gọi `GET /auth/refresh` bằng thanh địa chỉ.
  4. Test lại bằng cookie jar tách biệt (jar A token cũ, jar B token mới).

### Case F — Logout
- Bước:
  1. Login thành công.
  2. Gọi logout (`POST /auth/logout`).
  3. Truy cập route protected bất kỳ.
- Kỳ vọng:
  - Cookie auth bị xóa.
  - Route protected redirect về login.

### Case G — Quản trị thiết bị đăng nhập
- Bước:
  1. Login thành công.
  2. Truy cập `/auth/sessions`.
- Kỳ vọng:
  - Với `admin`/`huan_luyen_vien`: hiển thị danh sách phiên đang hoạt động.
  - Với `vo_sinh`: không có tab quản trị phiên và truy cập trực tiếp `/auth/sessions` bị chặn quyền.
  - Danh sách phiên chỉ thuộc tài khoản hiện tại.

### Case H — Revoke từng session
- Bước:
  1. Login ở 2 trình duyệt (hoặc 2 cookie jar) cùng tài khoản `admin`.
  2. Trên phiên A, mở `/auth/sessions` và thu hồi phiên B.
  3. Dùng phiên B truy cập route protected.
- Kỳ vọng:
  - Phiên B bị buộc đăng nhập lại.
  - Phiên A vẫn hoạt động bình thường.
  - Không thể dùng tài khoản khác để thu hồi session không thuộc tài khoản hiện tại.

### Case I — Giới hạn số session tối đa
- Bước:
  1. Đặt `AUTH_MAX_ACTIVE_SESSIONS=2` trong `.env`.
  2. Login cùng tài khoản trên 3 thiết bị/3 cookie jar.
  3. Kiểm tra lại `/auth/sessions`.
- Kỳ vọng:
  - Chỉ còn tối đa 2 phiên active mới nhất.
  - Phiên cũ nhất bị thu hồi.

## 4) Kịch bản test nhanh bằng curl (tuỳ chọn)
- Dùng `-c`/`-b` để lưu cookie jar riêng theo từng role.
- Kiểm tra:
  - Login -> HTTP 302.
  - `POST /auth/refresh` -> JSON `ok: true`.
  - Reuse refresh cũ -> HTTP 401.

## 5) Checklist pass trước commit
- [x] Login đúng/sai hoạt động đúng
- [x] Route guard đúng theo role
- [x] Refresh rotation hoạt động
- [x] Reuse token cũ bị chặn
- [x] Logout thu hồi phiên
- [x] Không phát sinh lỗi mới trên luồng điểm danh hiện có
- [ ] Quản trị thiết bị đăng nhập hoạt động đúng
- [ ] Revoke từng session hoạt động đúng
- [ ] Giới hạn số session tối đa hoạt động đúng

## 6) Kết quả chạy test thủ công
- Trạng thái: **PASS toàn bộ test case A → F**.
- Lưu ý riêng Case E: quan sát thực tế cho thấy response cuối có thể là `200` do redirect về login, đồng thời cookie bị xóa; hành vi này phù hợp tiêu chí bảo mật của flow revoke session.
