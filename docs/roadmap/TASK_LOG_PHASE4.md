# Logging Phase 4 — Metrics nhẹ từ log + endpoint quan sát nhanh

## Mục tiêu
Tạo lớp quan sát nhanh để đội dev/UX kiểm tra health mà chưa cần stack log tập trung:
- Tổng hợp số lượng event theo `status`
- Xem chuỗi metric theo phút trong cửa sổ thời gian ngắn

## Đã triển khai

### 1) In-memory rolling metrics trong logger
- Mỗi log event sẽ được cộng dồn theo bucket phút với key:
  - `event`, `module`, `action`, `status`
- Có cơ chế dọn bucket cũ theo cửa sổ rolling.
- Cấu hình cửa sổ qua env:
  - `APP_LOG_METRICS_WINDOW_MINUTES` (mặc định `60` phút)

### 2) API quan sát nhanh
- Route mới: `GET /observability/log-metrics`
- Quyền truy cập: `admin`, `huan_luyen_vien`
- Query hỗ trợ:
  - `last_minutes` (mặc định `15`, tối đa theo window cấu hình)
- Response gồm:
  - `summary.total`
  - `summary.byStatus`
  - `series[]` theo phút

## File thay đổi
- [utils/appLogger.js](../../utils/appLogger.js)
- [routes/observability.js](../../routes/observability.js)
- [app.js](../../app.js)

## Cách dùng nhanh
1. Chạy app và thao tác login/điểm danh như bình thường.
2. Gọi endpoint:
   - `/observability/log-metrics`
   - hoặc `/observability/log-metrics?last_minutes=30`
3. Theo dõi nhanh:
   - `failed` tăng bất thường
   - `conflict` tăng cao ở giờ cao điểm

## Ghi chú
- Đây là metrics in-memory phục vụ dev/qa nhanh, sẽ reset khi restart app.
- Chưa thay thế monitoring tập trung production.

## Rollback
- Revert 3 file ở mục "File thay đổi" để quay về trạng thái cuối Phase 3.
