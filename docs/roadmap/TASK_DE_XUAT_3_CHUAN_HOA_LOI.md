# Triển khai Đề xuất 3 — Chuẩn hóa lỗi trả về user

## Mục tiêu
- Không trả lỗi kỹ thuật nội bộ (DB/infra raw) trực tiếp ra UI/API.
- Giữ thông điệp rõ ràng cho người dùng và vẫn hỗ trợ debug nội bộ qua log.

## Phạm vi đã triển khai
- Route view-first: `/buoi-hoc`, `/diem-danh`, `/lop-vo`, `/check-in`, `/auth/login`.
- Route API JSON: `/bac-dai/api*`, `/vo-sinh/api*`, `/auth/refresh`.

## Cách làm
- Tạo helper chung tại [utils/publicError.js](utils/publicError.js):
  - `getPublicApiErrorMessage()`
  - `getPublicViewErrorMessage()`
- Mapping mã lỗi DB phổ biến (`23505`, `23503`, `22P02`) sang thông điệp thân thiện.
- Thay thế `error.message` ở response client bằng thông điệp an toàn theo ngữ cảnh.
- Vẫn giữ `error.message` trong metadata log nội bộ cho mục đích audit/debug.

## File thay đổi
- [utils/publicError.js](utils/publicError.js)
- [routes/auth.js](routes/auth.js)
- [routes/checkIn.js](routes/checkIn.js)
- [routes/buoiHoc.js](routes/buoiHoc.js)
- [routes/diemDanh.js](routes/diemDanh.js)
- [routes/lopVo.js](routes/lopVo.js)
- [routes/voSinh.js](routes/voSinh.js)
- [routes/bacDai.js](routes/bacDai.js)

## Test nhanh
1. Gây lỗi DB (ví dụ nhập dữ liệu trùng) ở `/vo-sinh/api` hoặc `/bac-dai/api`.
2. Kiểm tra response không lộ raw SQL/stack/internal message.
3. Kiểm tra các route view-first khi lỗi chỉ hiện thông điệp nghiệp vụ an toàn.
4. Kiểm tra auth login/refresh khi exception chỉ trả message chung cho user.
