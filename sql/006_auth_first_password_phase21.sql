-- Phase 2.1: Bắt buộc đổi mật khẩu lần đầu

alter table public.tai_khoan
  add column if not exists must_change_password boolean not null default false;

create index if not exists idx_tai_khoan_must_change_password
  on public.tai_khoan (must_change_password);

-- Giữ seed account hiện tại tiếp tục hoạt động bình thường
update public.tai_khoan
set must_change_password = false
where lower(ten_dang_nhap) in ('admin', 'hlv', 'vosinh1');
