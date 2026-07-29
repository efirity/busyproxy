-- Relay Earn — initial Supabase schema
-- Apply with service role / SQL editor

create extension if not exists "pgcrypto";

create table if not exists rate_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  cents_per_gb int not null,
  cellular_cents_per_gb int,
  min_withdraw_cents int not null default 2000,
  active boolean not null default true
);

insert into rate_plans (code, name, cents_per_gb, cellular_cents_per_gb, min_withdraw_cents)
values ('default', 'Default', 20, 10, 2000)
on conflict (code) do nothing;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  phone_verified_at timestamptz,
  display_name text,
  country_code char(2),
  status text not null default 'active'
    check (status in ('active','suspended','banned')),
  stripe_connect_account_id text,
  payout_ready boolean not null default false,
  rate_plan_id uuid references rate_plans(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists wallets (
  user_id uuid primary key references users(id) on delete cascade,
  available_cents int not null default 0,
  pending_withdraw_cents int not null default 0,
  lifetime_earn_cents int not null default 0,
  lifetime_withdrawn_cents int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_token_hash text not null,
  user_agent text,
  ip inet,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  twilio_sid text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_public_key text,
  name text not null default 'My phone',
  platform text check (platform in ('android','ios','web_agent')),
  app_version text,
  status text not null default 'offline'
    check (status in ('offline','online','sharing','banned')),
  wifi_only boolean not null default true,
  daily_cap_bytes bigint,
  last_seen_at timestamptz,
  last_ip inet,
  last_network_type text,
  country_code char(2),
  trust_score numeric(5,2) not null default 50,
  created_at timestamptz not null default now()
);
create index if not exists devices_user_idx on devices(user_id);
create index if not exists devices_status_idx on devices(status);

create table if not exists traffic_samples (
  id bigserial primary key,
  device_id uuid not null references devices(id),
  user_id uuid not null references users(id),
  bytes_up bigint not null default 0,
  bytes_down bigint not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  network_type text,
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists traffic_device_time on traffic_samples(device_id, period_start desc);

create table if not exists traffic_daily (
  user_id uuid not null references users(id),
  device_id uuid not null references devices(id),
  day date not null,
  bytes_total bigint not null default 0,
  earn_cents int not null default 0,
  primary key (device_id, day)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  type text not null check (type in (
    'traffic_earn','bonus','adjustment_credit',
    'withdrawal','adjustment_debit','clawback'
  )),
  amount_cents int not null,
  balance_after_cents int not null,
  reference_type text,
  reference_id text,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists ledger_user_time on ledger_entries(user_id, created_at desc);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  amount_cents int not null check (amount_cents > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','processing','paid','rejected','failed')),
  stripe_transfer_id text,
  review_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'ops'
    check (role in ('ops','finance','superadmin')),
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_log (
  id bigserial primary key,
  admin_id uuid references admin_users(id),
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  device_id uuid references devices(id),
  code text not null,
  severity text not null check (severity in ('low','medium','high')),
  details jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
