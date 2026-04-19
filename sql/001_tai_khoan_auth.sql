-- Production auth schema for Karate Tamnong
-- Run this script in Supabase SQL Editor

create table if not exists public.tai_khoan (
  id bigserial primary key,
  ten_dang_nhap varchar(100) not null,
  mat_khau_hash text not null,
  vai_tro varchar(32) not null check (vai_tro in ('admin', 'huan_luyen_vien', 'vo_sinh')),
  vo_sinh_id bigint null references public.vo_sinh(id) on delete set null,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  lan_dang_nhap_cuoi timestamptz null,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint tai_khoan_vo_sinh_required check (
    (vai_tro <> 'vo_sinh')
    or (vo_sinh_id is not null)
  )
);

create unique index if not exists uq_tai_khoan_ten_dang_nhap_lower
  on public.tai_khoan (lower(ten_dang_nhap));

create index if not exists idx_tai_khoan_vo_sinh_id
  on public.tai_khoan (vo_sinh_id);

create or replace function public.fn_tai_khoan_set_ngay_cap_nhat()
returns trigger
language plpgsql
as $$
begin
  new.ngay_cap_nhat = now();
  new.ten_dang_nhap = lower(trim(new.ten_dang_nhap));
  return new;
end;
$$;

drop trigger if exists trg_tai_khoan_set_ngay_cap_nhat on public.tai_khoan;

create trigger trg_tai_khoan_set_ngay_cap_nhat
before update or insert on public.tai_khoan
for each row
execute function public.fn_tai_khoan_set_ngay_cap_nhat();

-- Seed cơ bản cho môi trường mới
insert into public.tai_khoan (ten_dang_nhap, mat_khau_hash, vai_tro, vo_sinh_id, is_active)
select 'admin', '$2b$10$AnsRNrKyFt95Smp9puL/tu3mXdbAMU6m32SKPF5dl6x1NYam2tsOi', 'admin', null, true
where not exists (
  select 1 from public.tai_khoan where lower(ten_dang_nhap) = 'admin'
);

insert into public.tai_khoan (ten_dang_nhap, mat_khau_hash, vai_tro, vo_sinh_id, is_active)
select 'hlv', '$2b$10$xG5k8JjwKz8LD3bcKmfvxuhimrqS62XTz.M5BNq9jkrHi7GyxVSdK', 'huan_luyen_vien', null, true
where not exists (
  select 1 from public.tai_khoan where lower(ten_dang_nhap) = 'hlv'
);

-- Nếu đã có vo_sinh id=1 thì seed thêm tài khoản võ sinh demo
insert into public.tai_khoan (ten_dang_nhap, mat_khau_hash, vai_tro, vo_sinh_id, is_active)
select 'vosinh1', '$2b$10$P6DvbxhZ1r6o6Ezz7Ho2K.yXL8bekHh11iuL81OE0miT8Pfucph1q', 'vo_sinh', vs.id, true
from public.vo_sinh vs
where vs.id = 1
  and not exists (
    select 1 from public.tai_khoan where lower(ten_dang_nhap) = 'vosinh1'
  );
