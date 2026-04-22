# Tổng hợp tính năng và công nghệ dự án KARATE-TAMNONG

## 1) Mục tiêu dự án
Hệ thống web/web mobile hỗ trợ quản lý võ sinh và điểm danh theo buổi học, ưu tiên luồng vận hành thực tế cho huấn luyện viên và võ sinh.

---

## 2) Công nghệ đang sử dụng

### Backend
- Node.js
- Express
- EJS (render view server-side)
- Supabase (PostgreSQL)

### Thư viện chính
- `@supabase/supabase-js`
- `bcryptjs`
- `jsonwebtoken`
- `cookie-parser`
- `multer`
- `csv-parse`
- `dotenv`
- `morgan`
- `nodemon`

### Frontend/UI
- EJS templates
- CSS tĩnh tại `public/stylesheets/style.css`
- JavaScript client-side tại `public/javascripts/`

---

## 3) Kiến trúc & tổ chức mã nguồn
- `routes/`: xử lý route theo module nghiệp vụ.
- `services/`: nghiệp vụ auth token/session/audit.
- `middlewares/`: middleware xác thực/phân quyền.
- `utils/`: store/check logic dùng chung (attendance, auth config).
- `views/`: giao diện EJS theo từng màn hình.
- `sql/`: script schema/bổ sung bảng auth.
- `config/supabase.js`: kết nối Supabase.

Kiểu triển khai hiện tại: **view-first** (form submit + redirect + flash message), API JSON dùng cho một số module CRUD nội bộ.

---

## 4) Các tính năng chính đã có

## 4.1 Xác thực và phân quyền (production-oriented)
- Đăng nhập bằng tài khoản DB (`tai_khoan`).
- Access token (ngắn hạn) + Refresh token (dài hạn).
- Refresh token rotation theo từng lần refresh.
- Phát hiện refresh token không hợp lệ/reuse để revoke session.
- Quản trị phiên đăng nhập tại `/auth/sessions` (xem và thu hồi phiên).
- Phân quyền theo vai trò:
  - `admin`
  - `huan_luyen_vien`
  - `vo_sinh`
- JWT key rotation theo `kid`.
- Audit log sự kiện bảo mật (`auth_audit_log`).

## 4.2 Quản lý bậc đai
- Danh sách bậc đai.
- Thêm/Sửa/Xóa bậc đai.

## 4.3 Quản lý võ sinh
- Danh sách võ sinh.
- Thêm/Sửa/Xóa võ sinh.
- Import nhanh võ sinh bằng CSV:
  - Parse/validate từng dòng.
  - Bỏ qua dòng lỗi, vẫn import dòng hợp lệ.
  - Xử lý theo lô để ổn định hiệu năng.

## 4.4 Quản lý lớp võ
- Tạo/xóa lớp võ.
- Quản lý thành viên lớp:
  - Thêm võ sinh vào lớp.
  - Cập nhật trạng thái thành viên.
  - Xóa võ sinh khỏi lớp.

## 4.5 Quản lý buổi học
- Tạo buổi học theo lớp võ.
- Validate đầu vào (ngày, giờ, trùng buổi, lớp tồn tại).
- Xóa buổi học.

## 4.6 Điểm danh thủ công theo buổi
- Màn hình điểm danh `/diem-danh?buoi_hoc_id=`.
- Cập nhật trạng thái:
  - `co_mat`
  - `vang + co_phep`
  - `vang + khong_phep`
- Rule nghiệp vụ:
  - `co_mat` không đi kèm `loai_vang`.
  - `vang` bắt buộc có `loai_vang`.
- Thống kê theo buổi:
  - tổng võ sinh
  - đã điểm danh
  - có mặt
  - vắng có phép
  - vắng không phép
  - chưa cập nhật

## 4.7 Điểm danh trực tiếp (QR)
- Mở từ tab buổi học: `/buoi-hoc/diem-danh/:id`.
- Sinh phiên điểm danh gồm:
  - QR token
  - countdown
- Võ sinh check-in tại `/check-in` bằng token QR.
- Chặn check-in trùng `co_mat`.
- Ghi `ly_do = checkin_qr`.
- Hết hạn thì token không còn hiệu lực.

## 4.8 Tab vắng mặt
- Màn hình `/vang-mat` theo buổi học.
- Lọc theo loại vắng (`co_phep` / `khong_phep`).
- Tìm kiếm theo tên/ID võ sinh.
- Thống kê tổng hợp vắng mặt.

---

## 5) Cơ sở dữ liệu chính

### Bảng nghiệp vụ lõi
- `bac_dai`
- `vo_sinh`
- `lop_vo`
- `vo_sinh_lop`
- `buoi_hoc`
- `diem_danh`

### Bảng bảo mật/auth
- `tai_khoan`
- `auth_session`
- `auth_audit_log`

Convention chính: tiếng Việt không dấu, `snake_case`, cột thời gian `ngay_tao`/`ngay_cap_nhat`.

---

## 6) Tài liệu đã có trong dự án
- `README.md`
- `DB_CONVENTION.md`
- `MA_TRAN_DB_API_MVP.md`
- `MODULE_BUOI_HOC.md`
- `MODULE_DIEM_DANH.md`
- `DIEM_DANH_TRUC_TIEP_FLOW.md`
- `AUTH_TOKEN_SECURITY.md`
- `IMPORT_CSV_VO_SINH.md`
- `TEST_API_KICH_BAN.md`
- `TEST_MANUAL_QR_CHECKIN.md`
- `TEST_MANUAL_AUTH_TOKEN.md`
- `TEST_MANUAL_IMPORT_CSV.md`

---

## 7) Trạng thái tổng quan
Dự án đã có đầy đủ khối tính năng MVP cho một hệ thống điểm danh lớp võ:
- quản lý dữ liệu nền,
- quản lý buổi học,
- điểm danh thủ công,
- điểm danh trực tiếp QR,
- tab vắng mặt,
- auth production với session/refresh rotation.

Hướng triển khai phù hợp cho giai đoạn hiện tại: **ưu tiên ổn định luồng cốt lõi trước, sau đó tối ưu dần theo từng đợt**.
