-- Phase 2: Ràng buộc cấp tài khoản theo hồ sơ võ sinh

-- Mỗi hồ sơ võ sinh chỉ có tối đa 1 tài khoản đăng nhập
create unique index if not exists uq_tai_khoan_vo_sinh_id
  on public.tai_khoan (vo_sinh_id)
  where vo_sinh_id is not null;

create index if not exists idx_tai_khoan_vai_tro
  on public.tai_khoan (vai_tro);

create index if not exists idx_tai_khoan_is_active
  on public.tai_khoan (is_active);
