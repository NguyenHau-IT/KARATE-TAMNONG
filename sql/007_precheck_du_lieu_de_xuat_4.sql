-- Đề xuất 4 - Precheck dữ liệu trước khi khóa constraint DB
-- Chạy file này trước để rà dữ liệu bẩn/trùng.

-- 1) Trùng điểm danh cùng 1 võ sinh trong 1 buổi (phải = 0 dòng)
select buoi_hoc_id, vo_sinh_id, count(*) as so_lan
from public.diem_danh
group by buoi_hoc_id, vo_sinh_id
having count(*) > 1;

-- 2) Giá trị trạng thái điểm danh không hợp lệ (phải = 0 dòng)
select id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang
from public.diem_danh
where trang_thai_diem_danh not in ('co_mat', 'vang');

-- 3) Rule sai: co_mat nhưng có loai_vang (phải = 0 dòng)
select id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang
from public.diem_danh
where trang_thai_diem_danh = 'co_mat'
  and loai_vang is not null;

-- 4) Rule sai: vang nhưng thiếu/sai loai_vang (phải = 0 dòng)
select id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang
from public.diem_danh
where trang_thai_diem_danh = 'vang'
  and (loai_vang is null or loai_vang not in ('co_phep', 'khong_phep'));

-- 5) Trùng mã võ sinh (không phân biệt hoa-thường) (phải = 0 dòng)
select lower(ma_vo_sinh) as ma_vo_sinh_lower, count(*) as so_lan
from public.vo_sinh
group by lower(ma_vo_sinh)
having count(*) > 1;

-- 6) Trùng liên kết tài khoản -> võ sinh (phải = 0 dòng)
select vo_sinh_id, count(*) as so_tai_khoan
from public.tai_khoan
where vo_sinh_id is not null
group by vo_sinh_id
having count(*) > 1;
