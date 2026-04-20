# Brainstorm dự án CV – Hệ thống điểm danh võ sinh bằng điện thoại

## 1) Mục tiêu nghề nghiệp (gắn với bối cảnh sinh viên năm cuối)
- Xây một sản phẩm **giải quyết vấn đề thực tế** (điểm danh lớp võ).
- Tăng kỹ năng cứng theo hướng Fullstack: thiết kế DB, API, UI, auth, deploy, test.
- Tạo bộ minh chứng rõ để đưa vào CV: source code, demo, tài liệu, video.

## 2) Elevator pitch (30 giây)
**Karate Attendance System** là web app/web mobile giúp huấn luyện viên điểm danh võ sinh nhanh bằng QR, theo dõi trạng thái Có mặt/Có phép/Không phép theo thời gian thực, lọc dữ liệu linh hoạt và xuất báo cáo điểm danh theo buổi.

## 3) Scope chức năng đề xuất

### A. Đăng nhập
- Giảng viên được cung cấp tài khoản riêng để đăng nhập vào dashboard chính.
- Võ sinh được cung cấp tài khoản riêng để đăng nhập vào khu vực điểm danh cá nhân.
- Giảng viên mở buổi học và bấm nút **Điểm danh** để mở tab trình chiếu theo buổi học.
- Tab trình chiếu hiển thị QR phóng to + countdown.
- Sau khi đăng nhập, võ sinh điểm danh tại `/check-in` bằng quét QR.

### B. Tab Điểm danh
- Danh sách võ sinh theo buổi học.
- Mỗi võ sinh có 3 nút trạng thái:
  - Có mặt
  - Có phép
  - Không phép
- Thống kê realtime:
  - Tổng sĩ số
  - Đã điểm danh
  - Vắng có phép
  - Vắng không phép
- Bộ lọc:
  - Theo bậc đai
  - Theo tên
  - Theo trạng thái

### C. Tab Danh sách
- Hiển thị đầy đủ thông tin võ sinh:
  - Họ tên
  - Giới tính
  - Năm sinh
  - Địa chỉ
  - Bậc đai
- CRUD võ sinh.
- Tìm kiếm + phân trang.

### D. Tab Vắng mặt
- Tách riêng rõ:
  - Vắng có phép
  - Vắng không phép
- Filter nhanh 3 loại:
  - Tất cả
  - Có phép
  - Không phép

## 4) Công nghệ và kiến trúc

### Backend
- Node.js + Express (MVP theo luồng render view + form submit; API dùng nội bộ khi cần).
- Supabase (PostgreSQL + Realtime).
- Auth production-ready:
  - Tài khoản DB-backed theo vai trò (giảng viên, võ sinh)
  - Access token ngắn hạn + refresh token rotation
  - JWT key rotation theo `kid`

### Frontend
- EJS + Bootstrap (mobile-first).
- SweetAlert2 cho UX thao tác nhanh.

### Triển khai
- Render/Railway/Fly.io (web server).
- Supabase cloud (database + realtime).

## 5) Thiết kế dữ liệu (MVP + mở rộng)

### Bảng cốt lõi (theo convention DB hiện có)
- `bac_dai`
  - id, ten_bac_dai, mo_ta, ngay_tao, ngay_cap_nhat
- `vo_sinh`
  - id, ho_ten, gioi_tinh, nam_sinh, dia_chi, bac_dai_id, so_dien_thoai, ho_ten_phu_huynh, so_dien_thoai_phu_huynh
- `lop_vo`
  - id, ten_lop, lich_hoc, huan_luyen_vien
- `vo_sinh_lop`
  - id, vo_sinh_id, lop_vo_id, ngay_vao_lop, trang_thai
- `buoi_hoc`
  - id, lop_vo_id, ngay_hoc, gio_bat_dau, gio_ket_thuc, ghi_chu
- `diem_danh`
  - id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang, ly_do

### Ràng buộc quan trọng
- Unique `(buoi_hoc_id, vo_sinh_id)` để 1 võ sinh chỉ có 1 bản ghi/buổi.
- `trang_thai_diem_danh`: `co_mat`, `vang`.
- `loai_vang`: `co_phep`, `khong_phep` (khi `trang_thai_diem_danh = vang`).
- Index cho các cột filter nhiều: `buoi_hoc_id`, `vo_sinh_id`, `trang_thai_diem_danh`, `bac_dai_id`.

## 6) Route roadmap (MVP view-first, đủ dùng cho demo tuyển dụng)

### Route thao tác chính hiện tại
- `GET /lop-vo` (màn hình quản lý lớp võ)
- `POST /lop-vo/tao` (tạo lớp võ)
- `POST /lop-vo/them-vo-sinh` (thêm võ sinh vào lớp)
- `POST /lop-vo/cap-nhat-thanh-vien/:id` (cập nhật trạng thái thành viên lớp)
- `POST /lop-vo/xoa-thanh-vien/:id` (xóa võ sinh khỏi lớp)
- `GET /buoi-hoc` (màn hình quản lý buổi học)
- `POST /buoi-hoc/tao` (tạo buổi)
- `POST /buoi-hoc/xoa/:id` (xóa buổi)
- `GET /buoi-hoc/diem-danh/:id` (mở tab trình chiếu điểm danh trực tiếp cho buổi học)
- `GET /check-in` (view võ sinh điểm danh bằng QR)
- `POST /check-in` (xác nhận điểm danh võ sinh)
- `GET /diem-danh?buoi_hoc_id=` (màn hình điểm danh + tổng hợp)
- `POST /diem-danh/cap-nhat` (tạo/cập nhật điểm danh)
- `GET /vang-mat?buoi_hoc_id=` (tab vắng mặt, lọc có phép/không phép)

### API mở rộng (phase sau)

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Sessions + Generate QR
- `POST /api/sessions` (mở buổi)
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/generate-attendance-code` (generate QR token)
- `GET /api/sessions/:id/attendance-code` (lấy QR token đang hiệu lực)
- `POST /api/attendance/check-in-qr` (võ sinh quét QR)

### Attendance
- `GET /api/attendance?sessionId=&status=&beltId=&q=`
- `PUT /api/attendance/:id/status`
- `GET /api/attendance/summary?sessionId=`

### Students
- `GET /api/students`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`

## 7) User flow chính
1. Giảng viên đăng nhập bằng tài khoản riêng và vào dashboard chính.
2. Giảng viên tạo/mở buổi học.
3. Giảng viên bấm nút Điểm danh tại buổi học, mở tab trình chiếu có QR + countdown.
4. Võ sinh đăng nhập bằng tài khoản riêng.
5. Võ sinh điểm danh bằng quét QR tại `/check-in`.
6. Giảng viên xử lý thủ công các trường hợp còn thiếu tại `/diem-danh?buoi_hoc_id=` thành Có mặt/Có phép/Không phép.
7. Tab Vắng mặt hiển thị rõ 2 nhóm vắng.
8. Kết thúc buổi: xem báo cáo tổng kết.

## 8) Feature “ăn điểm CV” (ưu tiên cao)
- Realtime cập nhật danh sách + thống kê không cần F5.
- QR token có TTL và chống quét trùng.
- Audit log thay đổi trạng thái (ai sửa, lúc nào).
- Validation chặt input ở cả client và server.
- Soft delete cho học viên để giữ lịch sử điểm danh.

## 9) Bảo mật tối thiểu (mức intern/junior tốt)
- Không lưu password thô, dùng hash (`bcryptjs`).
- Rate limit cho endpoint login và endpoint check-in.
- Kiểm tra quyền trước khi sửa điểm danh.
- Tách key `SERVICE_ROLE` khỏi frontend tuyệt đối.
- Dùng `helmet` + sanitize input + chuẩn hóa lỗi API.

## 10) Testing plan ngắn gọn
- Unit test:
  - validate payload
  - map trạng thái điểm danh
- Integration test:
  - flow tạo buổi -> điểm danh -> thống kê
- UAT checklist:
  - mobile responsive
  - thao tác 3 trạng thái mượt
  - filter đúng kết quả

## 11) Lộ trình 6 tuần
- Nội dung triển khai chi tiết đã tách thành tài liệu chuẩn:
  - [LO_TRINH_DU_AN.md](LO_TRINH_DU_AN.md)
- File này chỉ giữ vai trò định hướng ý tưởng/scope để tránh lặp nội dung.

## 12) Checklist deliverables để apply CV
- [ ] Link source code public/private có README đầy đủ
- [ ] Link demo live
- [ ] ERD + ảnh kiến trúc
- [ ] API collection (Postman/Bruno)
- [ ] Video demo 2–3 phút
- [ ] 3 bullet CV định lượng kết quả

## 13) Gợi ý bullet CV (copy dùng ngay)
- Xây dựng web app điểm danh lớp võ bằng Node.js/Express/Supabase, tối ưu thao tác điểm danh xuống còn 1 chạm/trạng thái.
- Thiết kế quy trình check-in QR có TTL và cơ chế chống trùng, đảm bảo mỗi võ sinh chỉ có 1 bản ghi/buổi học.
- Phát triển dashboard realtime với bộ lọc theo tên, bậc đai, trạng thái vắng mặt, hỗ trợ theo dõi sĩ số tức thời cho huấn luyện viên.

## 14) Câu hỏi phỏng vấn có thể gặp (để luyện trước)
- Vì sao chọn Supabase thay vì MongoDB/Firebase?
- Làm sao chống quét QR nhiều lần?
- Cách đảm bảo nhất quán dữ liệu khi nhiều người cùng điểm danh?
- Nếu scale lên 5.000 võ sinh thì tối ưu ở đâu?
- Vì sao thiết kế status theo enum thay vì bool?

## 15) Nâng cấp sau thực tập (phase 2)
- Chụp ảnh nhận diện khuôn mặt khi check-in.
- PWA offline-first cho khu vực mạng yếu.
- Đa lớp/đa chi nhánh.
- Dashboard analytics theo tháng/quý.
- RBAC chi tiết: head coach, assistant, admin.

---

## Gợi ý thông điệp cá nhân khi trình bày dự án
"Em chọn bài toán điểm danh lớp võ vì gần thực tế, có nhiều tình huống nghiệp vụ rõ và đủ độ khó cho fullstack. Em tự triển khai từ thiết kế dữ liệu, API, giao diện mobile đến deploy; qua đó cải thiện kỹ năng backend, xử lý dữ liệu realtime và tư duy sản phẩm trước khi đi thực tập."