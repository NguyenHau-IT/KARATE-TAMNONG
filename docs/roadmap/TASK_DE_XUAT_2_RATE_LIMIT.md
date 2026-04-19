# Triển khai Đề xuất 2 — Rate limit endpoint nhạy cảm

## Mục tiêu
Giảm brute-force và spam request cho các endpoint quan trọng mà không phá luồng hiện tại.

## Phạm vi đã triển khai
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /check-in`

## Cách làm
- Dùng `express-rate-limit` tại middleware riêng.
- Login/check-in dùng handler redirect thân thiện với luồng view-first.
- Refresh dùng handler JSON `429`.

## File thay đổi
- [middlewares/rateLimit.js](middlewares/rateLimit.js)
- [routes/auth.js](routes/auth.js)
- [routes/checkIn.js](routes/checkIn.js)
- [app.js](app.js)
- [.env.example](.env.example)
- [README.md](README.md)

## Biến môi trường mới
- `APP_TRUST_PROXY`
- `RATE_LIMIT_LOGIN_WINDOW_MS`
- `RATE_LIMIT_LOGIN_MAX`
- `RATE_LIMIT_REFRESH_WINDOW_MS`
- `RATE_LIMIT_REFRESH_MAX`
- `RATE_LIMIT_CHECKIN_WINDOW_MS`
- `RATE_LIMIT_CHECKIN_MAX`

## Test nhanh
1. Gọi sai password liên tục > giới hạn -> bị redirect login với thông báo giới hạn.
2. Gọi `POST /auth/refresh` liên tục > giới hạn -> nhận `429` JSON.
3. Submit `/check-in` liên tục > giới hạn -> bị redirect với thông báo giới hạn.
