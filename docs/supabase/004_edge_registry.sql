-- Edge / reverse-tunnel registry (production persistence)
-- Control plane can use in-memory for preview; this is the durable schema.

create table if not exists edge_devices (
  device_id text primary key,
  user_id uuid references users(id) on delete set null,
  name text not null default 'Phone',
  platform text,
  network text,
  country_code char(2),
  exit_enabled boolean not null default true,
  online boolean not null default false,
  tunnel_id text,
  last_public_ip inet,
  device_secret_hash text not null,
  bytes_up bigint not null default 0,
  bytes_down bigint not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists edge_credentials (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  secret_hash text not null,
  label text not null default 'API access',
  bound_device_id text references edge_devices(device_id) on delete set null,
  bound_country char(2),
  allowlist_cidrs text[] not null default '{}',
  enabled boolean not null default true,
  use_count bigint not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists edge_connect_log (
  id bigserial primary key,
  credential_id uuid references edge_credentials(id) on delete set null,
  device_id text,
  source_ip inet,
  target_host text,
  ok boolean not null,
  code text,
  created_at timestamptz not null default now()
);

alter table edge_devices enable row level security;
alter table edge_credentials enable row level security;
alter table edge_connect_log enable row level security;
-- service_role only (no anon policies)
