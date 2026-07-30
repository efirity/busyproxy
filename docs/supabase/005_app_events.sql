-- App / mobile lifecycle event log (install → fully functional)
-- Retention: 14 days (pg_cron if available + app-side purge)

create table if not exists app_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references users(id) on delete set null,
  install_id text not null,
  session_token_hash text,
  phone text,
  event_type text not null,
  event_category text not null default 'lifecycle',
  message text,
  props jsonb not null default '{}'::jsonb,
  app_version text,
  platform text not null default 'android',
  device_model text,
  os_version text,
  client_ip text
);

create index if not exists app_events_user_created_idx
  on app_events (user_id, created_at desc);

create index if not exists app_events_install_created_idx
  on app_events (install_id, created_at desc);

create index if not exists app_events_type_created_idx
  on app_events (event_type, created_at desc);

create index if not exists app_events_created_idx
  on app_events (created_at);

create index if not exists app_events_phone_created_idx
  on app_events (phone, created_at desc);

comment on table app_events is
  'Mobile/web client analytics events; auto-purged after 14 days';

-- Daily purge of rows older than 14 days (requires pg_cron extension on Supabase)
-- Safe no-op if extension is missing — server also purges on ingest.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when others then
    raise notice 'pg_cron not available: %', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'purge_app_events_14d';

    perform cron.schedule(
      'purge_app_events_14d',
      '15 3 * * *',
      $cron$delete from public.app_events where created_at < now() - interval '14 days'$cron$
    );
  end if;
exception
  when others then
    raise notice 'could not schedule app_events purge: %', sqlerrm;
end $$;
