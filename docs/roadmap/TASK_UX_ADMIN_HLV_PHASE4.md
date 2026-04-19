# UX Sprint — Admin/HLV Phase 4

## Mục tiêu
Tăng độ mượt khi điểm danh liên tục trên mạng thực tế:
- Cảm giác phản hồi tức thì (optimistic UI)
- Tự thử lại 1 lần với lỗi tạm thời
- Nếu lỗi cuối cùng thì rollback đúng trạng thái trước đó

## Đã triển khai

### 1) Optimistic update theo từng dòng
- Khi click trạng thái, UI cập nhật ngay:
  - badge trạng thái
  - lý do vắng
  - màu nút active
  - số liệu summary
- Không chờ API trả về mới đổi giao diện.

### 2) Retry nhẹ cho lỗi tạm thời
- Request cập nhật từng dòng thử lại tối đa 1 lần khi:
  - lỗi mạng
  - hoặc HTTP 5xx từ server
- Không retry với lỗi nghiệp vụ 4xx.

### 3) Rollback an toàn khi thất bại
- Nếu sau retry vẫn lỗi, hệ thống khôi phục:
  - trạng thái cũ
  - lý do cũ
  - summary cũ
  - màu nút cũ
- Hiển thị toast lỗi rõ ràng.

### 4) Trạng thái pending trực quan
- Dòng đang gửi request có hiệu ứng mờ nhẹ (`attendance-row-pending`).
- Nút trong dòng bị disable trong lúc chờ phản hồi.

## Files đã thay đổi
- [views/diem-danh.ejs](views/diem-danh.ejs)
- [public/stylesheets/style.css](public/stylesheets/style.css)

## Test nhanh
1. Vào `/diem-danh?buoi_hoc_id=<id>`.
2. Click nhanh nhiều dòng: UI đổi ngay, không đợi roundtrip.
3. Thử ngắt mạng tạm thời rồi click:
   - thấy pending,
   - sau cùng rollback về trạng thái trước,
   - toast lỗi xuất hiện.
4. Mạng ổn định: summary và badge luôn đồng bộ sau cập nhật.
