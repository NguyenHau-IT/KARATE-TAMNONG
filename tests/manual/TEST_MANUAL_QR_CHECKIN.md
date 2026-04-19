# Test thủ công luồng Điểm danh gộp (PIN + QR)

## Điều kiện
1. Đăng nhập `admin` hoặc `huan_luyen_vien`.
2. Có buổi học hợp lệ và có võ sinh thuộc lớp.
3. Server đang chạy.

## Case 1 — Mở tab Điểm danh từ Buổi học
- Bước:
  1. Vào `/buoi-hoc`.
  2. Bấm `Điểm danh` tại một buổi.
- Kỳ vọng:
  - Mở tab mới trình chiếu điểm danh.
  - Có QR lớn + PIN 4 số + countdown.

## Case 2 — Võ sinh check-in bằng QR
- Bước:
  1. Đăng nhập `vo_sinh`.
  2. Quét QR (hoặc mở link token) để vào `/check-in?token=...`.
  3. Bấm check-in.
- Kỳ vọng:
  - Check-in thành công.
  - Bản ghi điểm danh là `co_mat`, `ly_do=checkin_qr`.

## Case 3 — Hết countdown
- Bước:
  1. Đợi countdown về 0 trên tab trình chiếu.
  2. Quan sát trạng thái hiển thị.
- Kỳ vọng:
  - QR/PIN bị vô hiệu.
  - PIN bị ẩn và có thanh thông báo hết hạn.

## Case 4 — Mở lại tab Điểm danh tạo phiên mới
- Bước:
  1. Mở tab Điểm danh lần 1 và lưu link cũ.
  2. Đóng tab, mở lại tab Điểm danh cùng buổi để tạo phiên mới.
  3. Dùng link cũ để check-in.
- Kỳ vọng:
  - Link cũ bị từ chối.
  - Chỉ phiên mới còn hiệu lực.

## Case 5 — Võ sinh không thuộc lớp
- Bước:
  1. Dùng tài khoản võ sinh không thuộc lớp buổi học.
  2. Mở link token hợp lệ.
- Kỳ vọng:
  - Bị từ chối với thông báo không thuộc lớp.
