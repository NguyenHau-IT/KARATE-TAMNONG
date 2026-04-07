# Module Điểm danh (MVP)

## 1) Mục tiêu
Điểm danh võ sinh theo buổi học với 3 trạng thái nghiệp vụ:
- Có mặt
- Vắng có phép
- Vắng không phép

## 2) Mapping DB
- Bảng chính: `diem_danh`
- FK:
  - `buoi_hoc_id` -> `buoi_hoc.id`
  - `vo_sinh_id` -> `vo_sinh.id`
- Trường nghiệp vụ:
  - `trang_thai_diem_danh`
  - `loai_vang`

## 3) Chuẩn trạng thái
- `trang_thai_diem_danh`:
  - `co_mat`
  - `vang`
- `loai_vang`:
  - `co_phep`
  - `khong_phep`
  - `null` khi `trang_thai_diem_danh = co_mat`

## 4) Quy tắc nghiệp vụ
- Mỗi võ sinh chỉ có 1 bản ghi trong 1 buổi.
- Không cho `co_mat` đi kèm `loai_vang`.
- Không cho `vang` mà thiếu `loai_vang`.
- Cập nhật trạng thái phải idempotent (gọi lặp không tạo bản ghi mới).

## 5) Route MVP (render view)

### 5.1 Danh sách điểm danh theo buổi
- Method: `GET`
- URL: `/diem-danh?buoi_hoc_id=`
- Mục tiêu: render tab điểm danh + thống kê theo buổi

### 5.2 Cập nhật trạng thái điểm danh
- Method: `POST`
- URL: `/diem-danh/cap-nhat`

Request body:
- `buoi_hoc_id` (number, bắt buộc)
- `vo_sinh_id` (number, bắt buộc)
- `trang_thai_diem_danh` (`co_mat|vang`, bắt buộc)
- `loai_vang` (`co_phep|khong_phep|null`, theo rule)
- `ly_do` (string, không bắt buộc)

### 5.3 Tổng hợp điểm danh theo buổi
- Tổng hợp được tính và hiển thị trực tiếp trên view `/diem-danh`

## 6) Mã lỗi chuẩn
- Thông báo lỗi được trả về qua query `error` sau redirect
- `500` được đưa vào trang lỗi chung nếu phát sinh lỗi hệ thống

## 7) Công thức kiểm tra tổng hợp
- `da_diem_danh = co_mat + vang_co_phep + vang_khong_phep`
- `chua_cap_nhat = tong_vo_sinh - da_diem_danh`

## 8) Ma trận chuyển trạng thái cốt lõi
- [ ] Chưa có bản ghi -> `co_mat`
- [ ] Chưa có bản ghi -> `vang + co_phep`
- [ ] Chưa có bản ghi -> `vang + khong_phep`
- [ ] `co_mat` -> `vang + co_phep`
- [ ] `co_mat` -> `vang + khong_phep`
- [ ] `vang + co_phep` -> `co_mat`
- [ ] `vang + khong_phep` -> `co_mat`
- [ ] `vang + co_phep` <-> `vang + khong_phep`

## 9) Luồng phản hồi trên giao diện (flash message)

### Thành công - cập nhật điểm danh
- Redirect về: `/diem-danh?buoi_hoc_id=<id>&message=Cập+nhật+trạng+thái+điểm+danh+thành+công`

### Thành công - tạo điểm danh mới
- Redirect về: `/diem-danh?buoi_hoc_id=<id>&message=Tạo+điểm+danh+thành+công`

### Lỗi validation/nghiệp vụ
- Redirect về: `/diem-danh?buoi_hoc_id=<id>&error=<noi_dung_loi>`

Ví dụ lỗi thường gặp:
- `Bắt buộc là 'co_phep' hoặc 'khong_phep' khi trạng thái là 'vang'`
- `Không được truyền loai_vang khi trạng thái là 'co_mat'`
- `Võ sinh không thuộc lớp của buổi học`

> Ghi chú: thống kê (`tong_vo_sinh`, `da_diem_danh`, `co_mat`, `vang_co_phep`, `vang_khong_phep`, `chua_cap_nhat`) hiển thị trực tiếp trên giao diện.
