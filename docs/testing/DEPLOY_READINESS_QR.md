# Deploy Readiness (QR-only)

Checklist này dùng cho nhánh B trước khi deploy staging/production.

## 1) DB migration
- [ ] Chạy file [sql/009_attendance_qr_session.sql](../../sql/009_attendance_qr_session.sql) trên Supabase SQL Editor.
- [ ] Xác nhận bảng `attendance_qr_session` đã tạo thành công.

## 2) Environment
- [ ] Có đầy đủ biến môi trường bắt buộc theo [.env.example](../../.env.example).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` đúng project cần deploy.
- [ ] `AUTH_JWT_SECRET` không dùng giá trị mặc định.

## 3) Pre-deploy automated check
Chạy lệnh:

```bash
npm run predeploy:check
```

Kỳ vọng:
- Tất cả mục báo ✅.
- Có thông báo cuối: `Pre-deploy check đạt`.

## 4) Runtime QR-only check
- [ ] Mở [buoi-hoc](../../views/buoi-hoc.ejs) và tạo phiên điểm danh.
- [ ] Mở [check-in](../../views/check-in.ejs) bằng QR token và điểm danh thành công.
- [ ] Token hết hạn thì bị từ chối đúng thông báo.
- [ ] Route `/check-in-pin` redirect về `/check-in`.

## 5) Đề xuất rollout
1. Deploy staging.
2. Test web + web mobile theo [TEST_MANUAL_QR_CHECKIN.md](../../tests/manual/TEST_MANUAL_QR_CHECKIN.md).
3. Nếu ổn, promote production.
