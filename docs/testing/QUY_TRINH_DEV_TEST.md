# Quy trình DEV + TEST theo từng tính năng

## Mục tiêu
Đảm bảo mỗi lần phát triển đều đi kèm kiểm thử, tránh chỉ viết mã rồi chuyển bước.

## Chu kỳ chuẩn cho 1 tính năng
1. Chốt phạm vi nhỏ (1 luồng chính).
2. Viết mã cho phạm vi đó.
3. Test ngay sau khi viết:
   - Happy path
   - Validation errors
   - Business rule errors
   - Regression tối thiểu
4. Sửa lỗi phát hiện trong bước test.
5. Cập nhật tài liệu liên quan.
6. Chốt task.

## Mẫu checklist thực thi
- [ ] Có tiêu chí Done rõ ràng trước khi code
- [ ] Có kịch bản test cho tính năng mới
- [ ] Đã chạy test happy path
- [ ] Đã chạy test lỗi đầu vào
- [ ] Đã chạy test quy tắc nghiệp vụ
- [ ] Đã chạy smoke test luồng cũ liên quan
- [ ] Đã cập nhật tài liệu

## Áp dụng ngay cho module hiện tại
- Buổi học: kiểm tra tạo/xóa + validate giờ + trùng buổi
- Điểm danh: kiểm tra 3 trạng thái + rule `loai_vang` + thống kê + filter
