# Luồng Điểm danh trực tiếp (gộp PIN + QR)

## Mục tiêu
Chuẩn hóa quy trình điểm danh theo buổi học bằng một phiên duy nhất:
- 1 QR token
- 1 mã PIN 4 số
- 1 countdown dùng chung

## Hai view nghiệp vụ
1. View trình chiếu cho lớp (mở từ tab Buổi học)
- Route: `/buoi-hoc/diem-danh/:id`
- Dành cho HLV hiển thị công khai trong lớp.
- Hiển thị QR lớn + PIN + countdown.
- Hết giờ: QR/PIN bị vô hiệu, PIN bị ẩn, hiện cảnh báo hết hạn.

2. View thao tác cho võ sinh
- Route: `/check-in` (hoặc `/check-in?token=...` khi quét QR)
- Võ sinh check-in bằng QR hoặc PIN trên cùng màn hình.
- Nếu không kịp tự check-in, HLV xử lý thủ công tại `/diem-danh?buoi_hoc_id=`.

## Quy tắc phiên điểm danh
- Mỗi lần mở `/buoi-hoc/diem-danh/:id` sẽ tạo phiên mới (token + pin + expiresAt).
- Phiên mới sẽ thay thế phiên cũ của cùng buổi học.
- Token/PIN cũ sẽ không còn hiệu lực.
- TTL hiện tại: 1 phút (đồng bộ PIN và QR).

## Kết quả điểm danh
- Check-in qua QR: ghi `ly_do = checkin_qr`.
- Check-in qua PIN: ghi `ly_do = checkin_pin`.
- Nếu đã có bản ghi `co_mat` trước đó: từ chối tạo trùng.

## Test nhanh
- Mở tab điểm danh trực tiếp từ `/buoi-hoc`.
- Quét QR hoặc nhập PIN ở `/check-in`.
- Đợi hết countdown, xác nhận QR/PIN hết hiệu lực.
- Mở lại tab điểm danh trực tiếp, xác nhận token cũ không dùng lại được.
