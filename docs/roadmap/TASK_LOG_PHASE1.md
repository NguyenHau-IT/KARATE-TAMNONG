# Logging Phase 1 — Observability nền cho luồng điểm danh async

## Mục tiêu
Thiết lập lớp quan sát tối thiểu để debug nhanh và đo độ ổn định cho luồng admin/HLV:
- Cập nhật từng dòng (async)
- Bulk update (async)
- Bulk undo/restore (async)

## Đã triển khai

### 1) Correlation ID toàn request
- Mỗi request có `requestId` và trả lại qua header `x-request-id`.
- Dùng để nối chuỗi: Browser Network -> backend log.

### 2) Structured logger dùng chung
- Thêm logger JSON chuẩn key-value:
  - `timestamp`, `level`, `event`, `module`, `action`, `status`, `requestId`, `actor`, `meta`
- Mặc định ghi ra stdout (phù hợp dev và production container).

### 3) Instrument cho 3 endpoint cốt lõi
- `POST /diem-danh/cap-nhat-json`
- `POST /diem-danh/cap-nhat-nhanh-json`
- `POST /diem-danh/cap-nhat-restore-json`

Các mốc log chính:
- `started`
- `validation_failed`
- `conflict` (single update)
- `succeeded` (có `durationMs`, số lượng cập nhật/conflict)
- `failed` (DB stage/unexpected exception)

## File thay đổi
- [middlewares/requestContext.js](../../middlewares/requestContext.js)
- [utils/appLogger.js](../../utils/appLogger.js)
- [app.js](../../app.js)
- [routes/diemDanh.js](../../routes/diemDanh.js)

## Cách quan sát ngay trong giai đoạn dev
1. Chạy app như bình thường.
2. Thao tác trên trang điểm danh.
3. Quan sát terminal: mỗi event sẽ in 1 dòng JSON.
4. Khi có lỗi UI, lấy `x-request-id` từ Network để truy đúng dòng log backend.

## Log không ghi
- Không ghi token/cookie/password.
- Không ghi dữ liệu nhạy cảm ngoài metadata cần thiết cho vận hành.

## Rollback
- Revert 4 file ở mục "File thay đổi" là quay về trạng thái trước phase log.
