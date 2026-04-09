# Logging Phase 5 — Lightweight alert rules + health status endpoint

## Mục tiêu
Bổ sung cảnh báo nhẹ để đội vận hành nhìn nhanh tình trạng hệ thống theo cửa sổ ngắn:
- Dựa trên số lượng `failed` và `conflict`
- Trả trạng thái: `ok | warning | critical`

## Đã triển khai

### 1) Alert rules (failed/conflict)
- Nguồn dữ liệu: metrics in-memory từ logger (Phase 4)
- Cửa sổ mặc định: `5` phút
- Ngưỡng mặc định:
  - `failed`: warning `>= 5`, critical `>= 15`
  - `conflict`: warning `>= 10`, critical `>= 30`
- Quy tắc tổng hợp:
  - Nếu bất kỳ chỉ số đạt critical -> `critical`
  - Ngược lại, nếu bất kỳ chỉ số đạt warning -> `warning`
  - Còn lại -> `ok`

### 2) Endpoint health nhanh
- `GET /observability/health`
- Alias: `GET /observability/alert-status`
- Query hỗ trợ:
  - `last_minutes` (override cửa sổ đánh giá)

Response chính:
- `data.status`: `ok|warning|critical`
- `data.counts`: `failed`, `conflict`, `total`
- `data.thresholds`: ngưỡng đang áp dụng
- `data.reasons`: lý do sinh cảnh báo
- `data.summary`: tóm tắt byStatus trong cửa sổ

## Cấu hình env mới
- `APP_LOG_METRICS_WINDOW_MINUTES`
- `OBS_ALERT_WINDOW_MINUTES`
- `OBS_ALERT_FAILED_WARNING`
- `OBS_ALERT_FAILED_CRITICAL`
- `OBS_ALERT_CONFLICT_WARNING`
- `OBS_ALERT_CONFLICT_CRITICAL`

## File thay đổi
- [routes/observability.js](../../routes/observability.js)
- [.env.example](../../.env.example)

## Cách test nhanh
1. Đăng nhập bằng `admin` hoặc `huan_luyen_vien`.
2. Gây vài thao tác thất bại/conflict (ví dụ stale tab, payload sai).
3. Gọi:
   - `/observability/health`
   - hoặc `/observability/health?last_minutes=5`
4. Kiểm tra `status` và `reasons` đổi theo số lượng lỗi.

## Rollback
- Revert [routes/observability.js](../../routes/observability.js) và [.env.example](../../.env.example).
