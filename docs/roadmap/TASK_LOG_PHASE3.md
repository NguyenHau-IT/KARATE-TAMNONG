# Logging Phase 3 — Auth + Check-in observability

## Mục tiêu
Mở rộng quan sát sang luồng đăng nhập và điểm danh trực tiếp để có trace gần end-to-end:
- Login / Refresh / Logout
- Check-in (view + submit QR/PIN)

## Đã triển khai

### 1) Auth route logging
Thêm structured log cho:
- `POST /auth/login` (`action=login`)
- `POST /auth/refresh` (`action=refresh`)
- `POST /auth/logout` (`action=logout`)

Các trạng thái chính:
- `started`
- `validation_failed` (login thiếu input)
- `failed` (token/account/session lỗi)
- `succeeded` (login/refresh/logout thành công)

Metadata tiêu biểu:
- `username`, `role`, `redirect`
- `reason`, `errorCode`
- `durationMs`

### 2) Check-in route logging
Thêm structured log cho:
- `GET /check-in` (`action=view_load`)
- `POST /check-in` (`action=submit`)

Các trạng thái chính:
- `started`
- `validation_failed`
- `failed` (không thuộc lớp, đã điểm danh trước đó, lỗi token/pin)
- `succeeded`

Metadata tiêu biểu:
- `hasToken`, `hasPin`, `selectedBuoiHocId`
- `voSinhId`, `method` (`checkin_qr|checkin_pin`)
- `reason`, `durationMs`

## File thay đổi
- [routes/auth.js](../../routes/auth.js)
- [routes/checkIn.js](../../routes/checkIn.js)

## Cách quan sát nhanh
1. Mở terminal app.
2. Thực hiện login/refresh/logout và check-in.
3. Lọc log theo `event=auth_operation` hoặc `event=checkin_operation`.
4. Dùng `requestId` để nối log với request ở browser network.

## Rollback
- Revert 2 file ở mục "File thay đổi" để quay về trạng thái cuối Phase 2.
