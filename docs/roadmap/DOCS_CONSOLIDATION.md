# Rà soát trùng lặp tài liệu (đợt hiện tại)

## Mục tiêu
Giảm nội dung lặp, giữ mỗi chủ đề có một tài liệu “nguồn sự thật” rõ ràng.

## Kết quả rà soát

### 1) Nhóm định hướng dự án
- File liên quan:
  - `PROJECT_BRAINSTORM.md`
  - `LO_TRINH_DU_AN.md`
- Mức độ trùng: **cao** (đặc biệt phần lộ trình 6 tuần).
- Hướng xử lý đã áp dụng:
  - `PROJECT_BRAINSTORM.md` giữ vai trò **ý tưởng/scope/câu chuyện CV**.
  - `LO_TRINH_DU_AN.md` giữ vai trò **kế hoạch thực thi theo tuần**.
  - Đã bỏ phần lộ trình chi tiết trùng trong `PROJECT_BRAINSTORM.md` và thay bằng link sang `LO_TRINH_DU_AN.md`.

### 2) Nhóm quy trình phát triển
- File liên quan:
  - `README.md`
  - `QUY_TRINH_DEV_TEST.md`
- Mức độ trùng: **trung bình-cao** (checklist và chu kỳ dev/test).
- Hướng xử lý đã áp dụng:
  - `README.md` chỉ giữ checklist ngắn.
  - Quy trình chi tiết chuyển về `QUY_TRINH_DEV_TEST.md`.

### 3) Nhóm điểm danh trực tiếp
- File liên quan:
  - `DIEM_DANH_TRUC_TIEP_FLOW.md`
  - `TEST_MANUAL_QR_CHECKIN.md`
- Mức độ trùng: **thấp-trung bình**.
- Kết luận:
  - **Không gộp** vì khác mục đích:
    - `DIEM_DANH_TRUC_TIEP_FLOW.md`: đặc tả luồng nghiệp vụ.
    - `TEST_MANUAL_QR_CHECKIN.md`: checklist kiểm thử thủ công.

### 4) Nhóm auth token
- File liên quan:
  - `AUTH_TOKEN_SECURITY.md`
  - `TEST_MANUAL_AUTH_TOKEN.md`
- Mức độ trùng: **thấp**.
- Kết luận:
  - **Không gộp** vì khác mục đích (thiết kế bảo mật vs test).
  - Đã cập nhật route test từ `/check-in-pin` sang `/check-in` để đồng bộ luồng mới.

### 5) Nhóm module/ma trận
- File liên quan:
  - `MODULE_BUOI_HOC.md`
  - `MODULE_DIEM_DANH.md`
  - `MA_TRAN_DB_API_MVP.md`
- Mức độ trùng: **trung bình**.
- Kết luận hiện tại:
  - Tạm giữ riêng vì 3 góc nhìn khác nhau:
    - module-level behavior
    - mapping DB/route tổng hợp
  - Có thể hợp nhất trong đợt sau nếu muốn giảm số lượng file.

## Quy ước duy trì sau khi gộp
1. Mỗi chủ đề chỉ có **1 file chính**.
2. File liên quan chỉ để link/reference, không copy nguyên nội dung.
3. Khi đổi route/flow, ưu tiên cập nhật:
   - file flow chính
   - file test manual tương ứng
   - `README.md` (mức tóm tắt)
