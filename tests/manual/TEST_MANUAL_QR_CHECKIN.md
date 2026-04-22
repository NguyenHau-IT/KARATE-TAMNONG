# Test thủ công luồng Điểm danh QR

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
  - Có QR lớn + countdown.

## Case 2 — Võ sinh check-in bằng QR
- Bước:
  1. Đăng nhập `vo_sinh`.
  2. Vào `/check-in`, bấm `Mở camera quét QR` và quét QR trên màn hình lớp.
  3. (Fallback) Nếu thiết bị không hỗ trợ camera, dán link QR vào ô `Dán link QR / token`.
- Kỳ vọng:
  - Hệ thống tự redirect sang `/check-in?token=...`.
  - Check-in tự động thành công, không cần bấm nút điểm danh với role `vo_sinh`.
  - Bản ghi điểm danh là `co_mat`, `ly_do=checkin_qr`.

## Case 3 — Hết countdown
- Bước:
  1. Đợi countdown về 0 trên tab trình chiếu.
  2. Quan sát trạng thái hiển thị.
- Kỳ vọng:
  - QR bị vô hiệu.
  - Có thanh thông báo hết hạn.

## Case 3.1 — Không cho check-in nếu thiếu token
- Bước:
  1. Mở trực tiếp `/check-in`.
  2. Chọn võ sinh rồi bấm check-in khi chưa có token.
- Kỳ vọng:
  - Bị từ chối với thông báo yêu cầu quét QR.

## Case 3.2 — Route PIN cũ được chuyển hướng
- Bước:
  1. Mở `/check-in-pin`.
- Kỳ vọng:
  - Được chuyển hướng về `/check-in` với thông báo ngừng hỗ trợ PIN.

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
