-- Enable RLS on all Relay public tables (see migration 002_enable_rls)
-- Applied 2026-07-30 via MCP

alter table if exists public.rate_plans enable row level security;
alter table if exists public.users enable row level security;
alter table if exists public.wallets enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.otp_challenges enable row level security;
alter table if exists public.devices enable row level security;
alter table if exists public.traffic_samples enable row level security;
alter table if exists public.traffic_daily enable row level security;
alter table if exists public.ledger_entries enable row level security;
alter table if exists public.withdrawals enable row level security;
alter table if exists public.admin_users enable row level security;
alter table if exists public.admin_audit_log enable row level security;
alter table if exists public.risk_flags enable row level security;

-- Public read of active rate plans only
create policy rate_plans_public_read on public.rate_plans
  for select to anon, authenticated
  using (active = true);

-- Sensitive tables: no policies for anon/authenticated = deny all
-- service_role bypasses RLS (server API only)

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.rate_plans to anon, authenticated;

alter table if exists public.users force row level security;
alter table if exists public.wallets force row level security;
alter table if exists public.sessions force row level security;
alter table if exists public.otp_challenges force row level security;
alter table if exists public.devices force row level security;
alter table if exists public.traffic_samples force row level security;
alter table if exists public.traffic_daily force row level security;
alter table if exists public.ledger_entries force row level security;
alter table if exists public.withdrawals force row level security;
alter table if exists public.admin_users force row level security;
alter table if exists public.admin_audit_log force row level security;
alter table if exists public.risk_flags force row level security;
