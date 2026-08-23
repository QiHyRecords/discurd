-- Server-side enforcement for internal notification fan-out and moderation actions.
-- Apply after the core and governance migrations.

create table public.internal_rate_limit_events (
  scope text not null,
  bucket_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (scope, bucket_start)
);

-- The prior composite primary key made nullable server/channel scope columns
-- implicitly non-null. Replace it with a surrogate key and a null-aware scope
-- uniqueness constraint so a user-wide fallback preference is valid.
alter table public.notification_preferences add column id uuid default gen_random_uuid();
update public.notification_preferences set id = gen_random_uuid() where id is null;
alter table public.notification_preferences alter column id set not null;
alter table public.notification_preferences drop constraint notification_preferences_pkey;
alter table public.notification_preferences alter column server_id drop not null;
alter table public.notification_preferences alter column channel_id drop not null;
alter table public.notification_preferences add primary key (id);
alter table public.notification_preferences add constraint notification_preferences_scope_unique unique nulls not distinct (user_id, server_id, channel_id);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  server_id uuid not null references public.servers(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  target_user_id uuid references public.profiles(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  action text not null check (action in ('warn', 'mute', 'delete_message', 'dismiss')),
  mute_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index moderation_actions_report_idx on public.moderation_actions(report_id, created_at desc);
create index moderation_actions_target_idx on public.moderation_actions(target_user_id, created_at desc) where target_user_id is not null;

create or replace function public.consume_internal_rate_limit(target_scope text, max_count integer, window_seconds integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare current_bucket timestamptz; next_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  if max_count < 1 or window_seconds < 1 then raise exception 'Invalid rate-limit rule'; end if;
  current_bucket := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.internal_rate_limit_events(scope, bucket_start, count)
  values (target_scope, current_bucket, 1)
  on conflict (scope, bucket_start) do update set count = public.internal_rate_limit_events.count + 1
  returning count into next_count;
  return next_count <= max_count;
end; $$;

alter table public.internal_rate_limit_events enable row level security;
alter table public.moderation_actions enable row level security;

-- Moderation actions and internal rate counters are service-only. Moderators use
-- the Edge Function, which verifies MODERATE_MEMBERS before the service write.
