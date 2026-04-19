-- Đề xuất 4 - Khóa ràng buộc DB cốt lõi (production hardening)
-- Chỉ chạy sau khi precheck (007) trả về sạch dữ liệu.

begin;

-- A) Khóa uniqueness điểm danh theo buổi + võ sinh
create unique index if not exists uq_diem_danh_buoi_hoc_vo_sinh
  on public.diem_danh (buoi_hoc_id, vo_sinh_id);

-- B) Index truy vấn phổ biến
create index if not exists idx_diem_danh_buoi_hoc_id
  on public.diem_danh (buoi_hoc_id);

create index if not exists idx_diem_danh_vo_sinh_id
  on public.diem_danh (vo_sinh_id);

create index if not exists idx_diem_danh_trang_thai
  on public.diem_danh (trang_thai_diem_danh);

-- C) Check constraint rule điểm danh
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_diem_danh_trang_thai'
      and conrelid = 'public.diem_danh'::regclass
  ) then
    alter table public.diem_danh
      add constraint chk_diem_danh_trang_thai
      check (trang_thai_diem_danh in ('co_mat', 'vang'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_diem_danh_loai_vang_theo_trang_thai'
      and conrelid = 'public.diem_danh'::regclass
  ) then
    alter table public.diem_danh
      add constraint chk_diem_danh_loai_vang_theo_trang_thai
      check (
        (trang_thai_diem_danh = 'co_mat' and loai_vang is null)
        or (trang_thai_diem_danh = 'vang' and loai_vang in ('co_phep', 'khong_phep'))
      );
  end if;
end
$$;

commit;
