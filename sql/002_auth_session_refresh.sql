-- Refresh token session store (rotation-ready)
-- Run after sql/001_tai_khoan_auth.sql

create table if not exists public.auth_session (
  id bigserial primary key,
  tai_khoan_id bigint not null references public.tai_khoan(id) on delete cascade,
  refresh_token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  replaced_by_session_id bigint null references public.auth_session(id) on delete set null,
  user_agent text null,
  ip_address text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_auth_session_refresh_token_hash
  on public.auth_session (refresh_token_hash);

create index if not exists idx_auth_session_tai_khoan_id
  on public.auth_session (tai_khoan_id);

create index if not exists idx_auth_session_expires_at
  on public.auth_session (expires_at);

create or replace function public.fn_auth_session_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_auth_session_set_updated_at on public.auth_session;

create trigger trg_auth_session_set_updated_at
before update on public.auth_session
for each row
execute function public.fn_auth_session_set_updated_at();
