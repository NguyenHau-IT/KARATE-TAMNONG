# Lộ trình triển khai dự án

## Thông tin chung
- Dự án: **Hệ thống Web/Web Mobile điểm danh võ sinh bằng điện thoại**
- Mục tiêu: Hoàn thiện MVP để đưa vào CV và demo khi phỏng vấn thực tập
- Stack: Node.js, Express, Supabase, Bootstrap
- Thời gian đề xuất: **6 tuần**
- Phạm vi tài liệu: chỉ theo dõi kế hoạch thực thi theo tuần (không lặp lại phần brainstorm ý tưởng).

> Cập nhật luồng triển khai hiện tại: ưu tiên **render view + submit form + redirect + flash message** cho các thao tác chính. API JSON được giữ ở mức hỗ trợ nội bộ.

> Tài liệu brainstorm/scope tổng quan xem tại: [PROJECT_BRAINSTORM.md](PROJECT_BRAINSTORM.md)

---

## Tuần 1 — Phân tích & nền tảng
### Mục tiêu
- Chốt yêu cầu MVP, phạm vi tính năng và kiến trúc.

### Việc cần làm
- Chốt user flow: Login PIN, Tab Điểm danh, Tab Danh sách, Tab Vắng mặt.
- Thiết kế ERD và schema DB trên Supabase.
- Tạo project structure backend (routes/controllers/services/middlewares).
- Tạo bộ dữ liệu seed (bậc đai, võ sinh mẫu).

### Kết quả đầu ra
- ERD + schema SQL.
- App chạy local được, kết nối Supabase thành công.

### Definition of Done
- [ ] Có tài liệu ERD
- [ ] Có script tạo bảng + seed
- [ ] Có trang chủ hiển thị dữ liệu mẫu

---

## Tuần 2 — Tab Danh sách (CRUD võ sinh)
### Mục tiêu
- Hoàn thiện CRUD võ sinh, bậc đai và lớp võ để quản trị dữ liệu nền.

### Việc cần làm
- Route CRUD theo view cho `vo_sinh` và `bac_dai`.
- Route quản lý `lop_vo` và gán võ sinh vào lớp qua `vo_sinh_lop`.
- Form thêm/sửa/xóa võ sinh.
- Tìm kiếm theo tên và lọc theo bậc đai.
- Validate input ở client + server.

### Kết quả đầu ra
- Tab Danh sách dùng ổn trên desktop và mobile.

### Definition of Done
- [ ] CRUD đầy đủ, không lỗi 500 khi nhập sai
- [ ] Có thông báo thành công/thất bại rõ ràng
- [ ] Lọc/tìm kiếm hoạt động đúng
- [ ] Có thể thêm/xóa võ sinh khỏi lớp võ

---

## Tuần 3 — Tab Điểm danh (thủ công)
### Mục tiêu
- Điểm danh theo buổi học với 3 trạng thái.

### Việc cần làm
- Tạo bảng `buoi_hoc`, `diem_danh` theo convention DB.
- Tạo màn hình mở buổi học tại `/buoi-hoc`.
- Hiển thị danh sách võ sinh và 3 nút:
  - Có mặt
  - Có phép
  - Không phép
- Tạo thống kê theo buổi hiển thị trực tiếp trên `/diem-danh`.

### Kết quả đầu ra
- HLV có thể hoàn thành điểm danh 1 buổi học bằng thao tác tay.

### Definition of Done
- [ ] Mỗi võ sinh có đúng 1 bản ghi/buổi (`UNIQUE(buoi_hoc_id, vo_sinh_id)`)
- [ ] Counter cập nhật đúng sau mỗi thao tác
- [ ] Có lọc theo trạng thái

---

## Tuần 4 — Điểm danh trực tiếp (PIN + QR)
### Mục tiêu
- Võ sinh có thể tự check-in bằng QR hoặc PIN trong cùng một phiên điểm danh.

### Việc cần làm
- Tạo tab trình chiếu điểm danh từ `/buoi-hoc` với QR lớn + PIN + countdown chung.
- Route `/check-in` dùng chung cho cả QR token và PIN.
- Vô hiệu đồng thời QR/PIN khi hết countdown.
- Chống duplicate check-in và token replay.

### Kết quả đầu ra
- Luồng điểm danh trực tiếp gộp PIN/QR hoạt động end-to-end.

### Definition of Done
- [ ] Token hết hạn không dùng lại được
- [ ] Không tạo trùng điểm danh cho cùng võ sinh/buổi
- [ ] Có log phương thức check-in (manual/pin/qr)

---

## Tuần 5 — Tab Vắng mặt + báo cáo
### Mục tiêu
- Quản lý rõ ràng vắng có phép/không phép, hỗ trợ theo dõi nhanh.

### Việc cần làm
- Màn hình Tab Vắng mặt tách 2 nhóm rõ ràng (đã có route `/vang-mat`).
- Bộ lọc nhanh 3 loại: tất cả / có phép / không phép (đã triển khai).
- Báo cáo theo buổi, theo ngày.
- Export CSV cơ bản.

### Kết quả đầu ra
- HLV có thể xem nhanh tình hình vắng mặt và tải báo cáo.

### Definition of Done
- [ ] Filter trả đúng dữ liệu
- [ ] Báo cáo khớp với dữ liệu điểm danh
- [ ] Export CSV mở được trên Excel/Google Sheets

---

## Tuần 6 — Hoàn thiện để apply CV
### Mục tiêu
- Đưa dự án lên mức “trình diễn được” cho nhà tuyển dụng.

### Việc cần làm
- Refactor code, dọn technical debt.
- Bổ sung bảo mật cơ bản: hash PIN, rate limit login, kiểm tra quyền.
- Chuẩn hóa auth production: access token ngắn hạn + refresh token rotation + JWT key rotation.
- Viết README chuẩn:
  - Mô tả bài toán
   - Kiến trúc (view-first ở MVP)
  - ERD
  - Hướng dẫn chạy
  - Demo ảnh/video
- Deploy bản public.

### Kết quả đầu ra
- Có link demo + repo + tài liệu đầy đủ.

### Definition of Done
- [ ] Deploy live thành công
- [ ] README đầy đủ và dễ đọc
- [ ] Có video demo 2–3 phút
- [ ] Có 3 bullet CV định lượng

---

## Mốc kiểm thử xuyên suốt
- Unit test: validate payload, mapping trạng thái.
- Integration test: tạo buổi -> điểm danh -> tổng hợp.
- UAT mobile: responsive, thao tác nhanh, không vỡ layout.

---

## Rủi ro & phương án dự phòng
1. **Realtime phức tạp hơn dự kiến**
   - Fallback sang polling mỗi 10–15 giây ở MVP.
2. **QR có lỗi thiết bị khi quét**
   - Cung cấp thao tác điểm danh tay song song.
3. **Thiếu thời gian tuần cuối**
   - Ưu tiên tính năng cốt lõi, giảm bớt nâng cấp nâng cao.

---

## Checklist cuối cùng trước khi nộp CV
- [ ] Repo sạch, commit rõ ràng
- [ ] README + ERD + tài liệu route/view flow
- [ ] Link demo hoạt động
- [ ] Video demo ngắn
- [ ] Chuẩn bị câu chuyện phỏng vấn (bài toán, quyết định kỹ thuật, bài học)
