-- Rollback cho Đề xuất 4 (nếu cần)

begin;

alter table public.diem_danh drop constraint if exists chk_diem_danh_loai_vang_theo_trang_thai;
alter table public.diem_danh drop constraint if exists chk_diem_danh_trang_thai;

drop index if exists public.uq_diem_danh_buoi_hoc_vo_sinh;
drop index if exists public.idx_diem_danh_buoi_hoc_id;
drop index if exists public.idx_diem_danh_vo_sinh_id;
drop index if exists public.idx_diem_danh_trang_thai;

commit;
