create table if not exists public.thinq_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_encrypted text not null,
  country text not null check (country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.thinq_accounts enable row level security;

revoke all on table public.thinq_accounts from anon, authenticated;
grant select, insert, update, delete on table public.thinq_accounts to service_role;
