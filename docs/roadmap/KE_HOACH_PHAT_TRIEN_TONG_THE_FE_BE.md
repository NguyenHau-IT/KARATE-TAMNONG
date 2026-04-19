# Kế hoạch phát triển tổng thể FE + BE (triển khai theo Phase)

## 1) Mục tiêu tổng thể
- Hoàn thiện hệ thống điểm danh vận hành ổn định cho `admin`/`huan_luyen_vien`/`vo_sinh`.
- Giữ nhịp triển khai nhỏ, an toàn, có thể rollback nhanh.
- Mỗi phase đều có đầu ra rõ ràng: tính năng, test, tài liệu, tiêu chí nghiệm thu.

## 2) Hiện trạng dự án (snapshot)
- Kiến trúc hiện tại: `Express + EJS + Supabase` theo hướng view-first.
- Đã có core nghiệp vụ: quản lý lớp, buổi học, điểm danh, vắng mặt, check-in QR/PIN.
- Đã có auth production-oriented: access/refresh, rotation, session revoke, audit.
- Đã có observability nền: requestId + structured logs + metrics/health endpoint.

---

## 3) Roadmap triển khai theo Phase

## Phase 1 — Ổn định vận hành cốt lõi (Hardening)
### FE
- Chốt UX điểm danh thao tác nhanh 1 chạm.
- Chuẩn hóa thông điệp lỗi/thành công và hiển thị `requestId` khi lỗi.
- Tối ưu responsive màn hình [views/diem-danh.ejs](../../views/diem-danh.ejs).

### BE
- Khóa ràng buộc dữ liệu cốt lõi (đã có migration nền, rà lại rollout thực tế).
- Chuẩn hóa mã lỗi nghiệp vụ ở route điểm danh/check-in.
- Đảm bảo route auth/check-in/attendance có log đủ để truy vết.

### Test & DoD
- Pass manual smoke cho 4 luồng: single, bulk, undo, conflict.
- Không có lỗi regress ở `/check-in`, `/buoi-hoc`, `/diem-danh`, `/vang-mat`.
- Có tài liệu test cập nhật trong [tests/manual](../../tests/manual).

---

## Phase 2 — Tối ưu UX admin/HLV theo ca vận hành
### FE
- Thêm thao tác 1-click copy `requestId`.
- Tối ưu keyboard-first + sticky controls cho danh sách dài.
- Tăng khả năng nhìn nhanh trạng thái thao tác (working/warning/error).

### BE
- Tối ưu payload JSON trả về cho các endpoint async để UI xử lý mượt hơn.
- Giảm nhánh lỗi trùng lặp, gom helper xử lý conflict/restore.

### Test & DoD
- Thời gian thao tác điểm danh hàng loạt giảm rõ rệt (định lượng theo UAT).
- Conflict được xử lý đúng, không ghi đè sai trạng thái mới hơn.

---

## Phase 3 — Mở rộng nghiệp vụ người dùng võ sinh
### FE
- Nâng trải nghiệm check-in `/check-in`: thông báo rõ token/pin hết hạn, trạng thái buổi học.
- Hoàn thiện luồng first-login đổi mật khẩu.

### BE
- Siết rule cho check-in duplicate/replay.
- Chuẩn hóa event log cho check-in theo `method` và `result`.
- Bổ sung rate-limit theo tình huống cao điểm nếu cần.

### Test & DoD
- Luồng QR/PIN ổn định trong điều kiện mạng yếu vừa phải.
- Không phát sinh ghi nhận điểm danh trùng cho cùng buổi + võ sinh.

---

## Phase 4 — Chất lượng phần mềm (QA + Automation)
### FE
- Thiết lập test UI mức smoke cho các màn hình chính.
- Bổ sung kiểm tra regression layout ở breakpoint quan trọng.

### BE
- Thêm test API/integration cho các route trọng yếu:
  - `/diem-danh/cap-nhat-json`
  - `/diem-danh/cap-nhat-nhanh-json`
  - `/diem-danh/cap-nhat-restore-json`
  - `/auth/login`, `/auth/refresh`, `/check-in`

### Test & DoD
- Có bộ test tự động cho 4 luồng cốt lõi (single/bulk/conflict/undo).
- Có checklist release gate trước deploy.

---

## Phase 5 — Báo cáo và quan sát vận hành
### FE
- (Tùy chọn) Trang nội bộ mini-dashboard cho admin/HLV xem health nhanh.

### BE
- Dùng endpoint [routes/observability.js](../../routes/observability.js) để theo dõi trend `failed/conflict`.
- Chốt ngưỡng alert thực tế theo dữ liệu vận hành.
- Chuẩn bị output để tích hợp công cụ log tập trung.

### Test & DoD
- Đội vận hành đọc được `ok|warning|critical` và biết cách phản ứng.
- Có runbook sự cố ngắn cho ca điểm danh.

---

## Phase 6 — Scale kiến trúc (nâng cấp có kiểm soát, tùy chọn)
> Chỉ làm khi phase 1-5 ổn định và có nhu cầu mở rộng thực tế.

### Hướng A: Nâng cấp frontend hiện đại dần
- Giữ BE Express hiện tại.
- Chuyển dần FE từ EJS sang React/Next.js (BFF hoặc hybrid route-by-route).
- Lợi ích: component hóa, test UI tốt hơn, realtime client linh hoạt hơn.

### Hướng B: API-first có version
- Thiết kế lớp API chuẩn cho web/mobile, giữ view-first làm fallback.
- Bổ sung OpenAPI và contract test.
- Lợi ích: mở đường app mobile và tích hợp bên ngoài.

### Hướng C: Event-driven nhẹ cho attendance
- Phát event nội bộ khi cập nhật điểm danh (`attendance.updated`, `attendance.conflicted`).
- Dùng queue/bus nhẹ (Redis/NATS) khi cần scale đồng thời.
- Lợi ích: tách concern logging/audit/reporting khỏi luồng request chính.

### Hướng D: Realtime chuẩn hóa
- Dùng Supabase Realtime/WebSocket để cập nhật dashboard ngay không polling.
- Có fallback polling cho môi trường mạng không ổn định.

---

## 4) Ma trận ưu tiên triển khai
- Ưu tiên cao (làm ngay): Phase 1 -> Phase 2 -> Phase 3
- Ưu tiên trung bình: Phase 4 -> Phase 5
- Ưu tiên tùy điều kiện scale: Phase 6

---

## 5) Nguyên tắc triển khai từng phase
- Mỗi phase chia ticket nhỏ theo FE/BE/Test/Docs.
- Không gộp refactor lớn vào cùng phase tính năng.
- Mỗi phase phải có rollback plan cụ thể.
- Chỉ qua phase tiếp theo khi pass DoD phase hiện tại.

---

## 6) Đề xuất nhịp triển khai
- Mỗi phase: 1 sprint ngắn (1-2 tuần tùy khối lượng).
- Cuối sprint luôn có:
  - demo nội bộ,
  - checklist test pass,
  - quyết định go/no-go cho phase kế tiếp.
