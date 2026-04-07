# Kịch bản test luồng giao diện (MVP)

## 1) Mục tiêu
Kiểm thử các luồng thao tác trực tiếp trên giao diện cho 4 module:
- Lớp võ: `/lop-vo`
- Buổi học: `/buoi-hoc`
- Điểm danh: `/diem-danh`
- Vắng mặt: `/vang-mat`

## 2) Tiền điều kiện dữ liệu
Cần có sẵn dữ liệu tối thiểu trong DB:
- `lop_vo`: có ít nhất 1 bản ghi hợp lệ (ví dụ `id=1`)
- `vo_sinh`: có ít nhất 2 bản ghi (ví dụ `id=1`, `id=2`)
- `vo_sinh_lop`: gán `vo_sinh_id` vào `lop_vo_id=1`

## 3) Quy ước assert chung
- Thành công: hiển thị alert xanh (`message`)
- Lỗi nghiệp vụ/validate: hiển thị alert đỏ (`error`)
- Danh sách dữ liệu cập nhật đúng sau thao tác

---

## 4) Test module Lớp võ (view)

### LV-01: Mở màn hình lớp võ
- Truy cập: `GET /lop-vo`
- Kỳ vọng: thấy form tạo lớp, bảng lớp, khu quản lý thành viên khi chọn lớp

### LV-02: Tạo lớp võ
- Nhập `ten_lop`, `lich_hoc`, `huan_luyen_vien`, bấm tạo
- Kỳ vọng: thông báo thành công, lớp mới xuất hiện trong bảng

### LV-03: Chọn lớp để quản lý thành viên
- Bấm `Quản lý võ sinh` ở 1 lớp
- Kỳ vọng: thấy danh sách thành viên lớp và form thêm võ sinh

### LV-04: Thêm võ sinh vào lớp
- Chọn 1 võ sinh chưa vào lớp, nhập ngày vào lớp, chọn trạng thái
- Kỳ vọng: thông báo thành công, võ sinh xuất hiện trong danh sách thành viên

### LV-05: Chặn thêm trùng võ sinh cùng lớp
- Thêm lại võ sinh đã có trong lớp
- Kỳ vọng: hiển thị lỗi `Võ sinh đã thuộc lớp này`

### LV-06: Cập nhật trạng thái thành viên lớp
- Đổi `trang_thai` (ví dụ `dang_hoc` -> `bao_luu`) và lưu
- Kỳ vọng: thông báo thành công, dữ liệu cập nhật đúng

### LV-07: Xóa thành viên khỏi lớp
- Bấm xóa ở 1 thành viên lớp
- Kỳ vọng: thông báo thành công, thành viên bị xóa khỏi danh sách

---

## 5) Test module Buổi học (view)

### BH-01: Mở màn hình quản lý buổi học
- Truy cập: `GET /buoi-hoc`
- Kỳ vọng:
  - Thấy form tạo buổi học
  - Thấy bảng danh sách buổi học

### BH-02: Tạo buổi học tối thiểu
- Tại form `/buoi-hoc`, nhập:
  - `lop_vo_id=1`
  - `ngay_hoc=2026-03-20`
- Submit
- Kỳ vọng:
  - Quay lại trang `/buoi-hoc`
  - Hiển thị thông báo thành công
  - Có dòng buổi học mới trong bảng

### BH-03: Tạo buổi học đầy đủ thông tin
- Tại form `/buoi-hoc`, nhập:
  - `lop_vo_id=1`
  - `ngay_hoc=2026-03-21`
  - `gio_bat_dau=18:00`
  - `gio_ket_thuc=19:30`
  - `ghi_chu="Luyện kata"`
- Kỳ vọng: hiển thị thông báo thành công và dữ liệu hiển thị đúng trong bảng

### BH-04: Sai định dạng ngày
- Nhập `ngay_hoc=2026-99-99` (hoặc sửa request thủ công)
- Kỳ vọng: quay lại trang và hiển thị lỗi `ngay_hoc`

### BH-05: Sai thứ tự giờ
- Nhập `gio_bat_dau=20:00`, `gio_ket_thuc=19:00`
- Kỳ vọng: hiển thị lỗi `Giờ kết thúc phải lớn hơn giờ bắt đầu`

### BH-06: Không tìm thấy lớp võ
- Gửi `lop_vo_id` không tồn tại
- Kỳ vọng: hiển thị lỗi `Không tìm thấy lớp võ`

### BH-07: Trùng buổi học
- Tạo lại cùng `lop_vo_id`, `ngay_hoc`, `gio_bat_dau`, `gio_ket_thuc` đã có
- Kỳ vọng: hiển thị lỗi trùng buổi học

### BH-08: Xóa buổi học
- Bấm nút `Xóa` ở một dòng buổi học
- Kỳ vọng: thông báo thành công và dòng bị xóa khỏi bảng

---

## 6) Test module Điểm danh (view)

### DD-01: Mở màn hình điểm danh
- Truy cập: `GET /diem-danh`
- Kỳ vọng: thấy dropdown chọn buổi học

### DD-02: Chọn buổi học và tải danh sách
- Chọn 1 buổi học rồi bấm xem
- Kỳ vọng:
  - Hiển thị bảng võ sinh của lớp
  - Hiển thị thẻ thống kê (tổng, đã điểm danh, có mặt, vắng...)

### DD-03: Cập nhật trạng thái Có mặt
- Ở 1 dòng võ sinh, chọn `co_mat`, `loai_vang` để trống
- Bấm `Lưu`
- Kỳ vọng: quay lại cùng buổi học, thông báo thành công, badge hiển thị `Có mặt`

### DD-04: Cập nhật trạng thái Vắng có phép
- Chọn `trang_thai_diem_danh=vang`, `loai_vang=co_phep`, nhập lý do
- Kỳ vọng: thông báo thành công, badge `Vắng có phép`

### DD-05: Cập nhật trạng thái Vắng không phép
- Chọn `trang_thai_diem_danh=vang`, `loai_vang=khong_phep`
- Kỳ vọng: thông báo thành công, badge `Vắng không phép`

### DD-06: Rule sai `co_mat` nhưng có `loai_vang`
- Chọn `co_mat` đồng thời chọn `loai_vang=co_phep`
- Kỳ vọng: hiển thị thông báo lỗi rule

### DD-07: Rule sai `vang` nhưng bỏ trống `loai_vang`
- Chọn `vang` và để `loai_vang` trống
- Kỳ vọng: hiển thị thông báo lỗi rule

### DD-08: Buổi học không tồn tại
- Truy cập trực tiếp `/diem-danh?buoi_hoc_id=999999`
- Kỳ vọng: hiển thị thông báo lỗi `Không tìm thấy buổi học`

### DD-09: Kiểm tra công thức thống kê trên view
- Kỳ vọng:
  - `da_diem_danh = co_mat + vang_co_phep + vang_khong_phep`
  - `chua_cap_nhat = tong_vo_sinh - da_diem_danh`

---

## 7) Test module Vắng mặt (view)

### VM-01: Mở tab vắng mặt
- Truy cập: `GET /vang-mat`
- Kỳ vọng: thấy bộ lọc buổi học + loại vắng + từ khóa

### VM-02: Chọn buổi học và xem danh sách vắng
- Chọn 1 buổi học đã có dữ liệu vắng
- Kỳ vọng: hiển thị danh sách võ sinh vắng và tổng hợp

### VM-03: Lọc theo loại vắng
- Lọc `co_phep`, sau đó lọc `khong_phep`
- Kỳ vọng: kết quả đúng theo loại vắng

### VM-04: Lọc theo tên / ID võ sinh
- Nhập từ khóa theo tên hoặc ID
- Kỳ vọng: kết quả lọc đúng

### VM-05: Kiểm tra tổng hợp tab vắng mặt
- Kỳ vọng:
  - `tong_vang = vang_co_phep + vang_khong_phep`

---

## 6) Bộ smoke test tối thiểu (chạy nhanh)
Chỉ cần chạy 6 case sau để xác nhận luồng chính:
1. LV-02
2. LV-04
3. BH-02
4. DD-03
5. VM-02
6. VM-05

Nếu cả 6 case pass, có thể coi luồng view MVP chạy được ở mức demo.