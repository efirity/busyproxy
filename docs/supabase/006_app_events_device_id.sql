-- Per-device app event filtering (edge device id + install id)
-- Safe to re-run.

alter table if exists app_events
  add column if not exists device_id text;

create index if not exists app_events_device_created_idx
  on app_events (device_id, created_at desc)
  where device_id is not null;

comment on column app_events.device_id is
  'Edge/agent device id (dev_…) when known; used for Admin per-device logs';
