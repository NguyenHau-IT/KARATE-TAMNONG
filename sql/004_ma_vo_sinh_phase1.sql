-- Phase 1: Chuẩn hóa định danh võ sinh
-- Mục tiêu: thêm mã võ sinh duy nhất theo format Kyy-xxxxx
-- Ví dụ: K26-00001

alter table public.vo_sinh
  add column if not exists ma_vo_sinh varchar(20);

alter table public.vo_sinh
  add column if not exists khoa_nhap_hoc smallint null;

-- Backfill mã cho dữ liệu cũ theo id để đảm bảo duy nhất
update public.vo_sinh
set ma_vo_sinh = concat('K', right(extract(year from coalesce(ngay_tao, now()))::text, 2), '-', lpad(id::text, 5, '0'))
where ma_vo_sinh is null or btrim(ma_vo_sinh) = '';

-- Backfill khóa nhập học (nếu chưa có)
update public.vo_sinh
set khoa_nhap_hoc = extract(year from coalesce(ngay_tao, now()))::smallint
where khoa_nhap_hoc is null;

alter table public.vo_sinh
  alter column ma_vo_sinh set not null;

create unique index if not exists uq_vo_sinh_ma_vo_sinh_lower
  on public.vo_sinh (lower(ma_vo_sinh));

create index if not exists idx_vo_sinh_khoa_nhap_hoc
  on public.vo_sinh (khoa_nhap_hoc);

alter table public.vo_sinh
  add constraint chk_vo_sinh_ma_vo_sinh_format
  check (ma_vo_sinh ~ '^K[0-9]{2}-[0-9]{5}$');

alter table public.vo_sinh
  add constraint chk_vo_sinh_khoa_nhap_hoc
  check (khoa_nhap_hoc between 2000 and 2100);
