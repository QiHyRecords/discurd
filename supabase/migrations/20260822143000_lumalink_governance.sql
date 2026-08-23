-- LumaLink governance, privacy, discovery, and moderation extension.
-- Run after 20260822130000_lumalink_core.sql.

create table public.account_consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  community_policy_version text not null,
  age_confirmed_at timestamptz not null,
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  server_id uuid references public.servers(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  level text not null check (level in ('all', 'mentions', 'none')),
  primary key (user_id, server_id, channel_id),
  check (channel_id is null or server_id is not null)
);

create table public.server_tags (
  server_id uuid not null references public.servers(id) on delete cascade,
  tag text not null check (tag ~ '^[a-z0-9-]{2,32}$'),
  primary key (server_id, tag)
);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_fingerprint text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  device_label text not null check (char_length(device_label) <= 120),
  ip_hash text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.two_factor_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  factor_type text not null check (factor_type in ('totp', 'email')),
  secret_encrypted text,
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, factor_type)
);

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'expired', 'failed')),
  storage_path text,
  expires_at timestamptz,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.account_deletion_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz
);

create table public.rate_limit_events (
  subject_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  bucket_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (subject_id, action, bucket_start)
);

create index server_tags_tag_idx on public.server_tags(tag, server_id);
create index sessions_user_active_idx on public.user_sessions(user_id, last_seen_at desc) where revoked_at is null;
create index export_requests_user_idx on public.data_export_requests(user_id, requested_at desc);
create index reports_open_idx on public.reports(server_id, created_at desc) where status in ('open', 'reviewing');

create or replace function public.consume_rate_limit(target_action text, max_count integer, window_seconds integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare current_bucket timestamptz; next_count integer;
begin
  if auth.uid() is null then return false; end if;
  current_bucket := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.rate_limit_events(subject_id, action, bucket_start, count)
  values (auth.uid(), target_action, current_bucket, 1)
  on conflict (subject_id, action, bucket_start) do update set count = public.rate_limit_events.count + 1
  returning count into next_count;
  return next_count <= max_count;
end; $$;

create or replace function public.redeem_invite(invite_code text) returns table(server_id uuid, channel_id uuid)
language plpgsql security definer set search_path = public as $$
declare invite_row public.invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  select * into invite_row from public.invites where code = invite_code and revoked_at is null for update;
  if not found or (invite_row.expires_at is not null and invite_row.expires_at <= now()) or (invite_row.max_uses is not null and invite_row.use_count >= invite_row.max_uses) then raise exception 'Invite unavailable'; end if;
  insert into public.server_members(server_id, user_id) values (invite_row.server_id, auth.uid()) on conflict do nothing;
  update public.invites set use_count = use_count + 1 where id = invite_row.id;
  return query select invite_row.server_id, invite_row.channel_id;
end; $$;

alter table public.account_consents enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.server_tags enable row level security;
alter table public.webhooks enable row level security;
alter table public.user_sessions enable row level security;
alter table public.two_factor_factors enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.rate_limit_events enable row level security;

create policy "users manage own consents" on public.account_consents for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own notification preferences" on public.notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public tags visible only for discoverable servers" on public.server_tags for select to authenticated using (exists (select 1 from public.servers s where s.id = server_id and (s.is_discoverable or public.is_server_member(s.id))));
create policy "sessions are private" on public.user_sessions for select to authenticated using (user_id = auth.uid());
create policy "factors are private" on public.two_factor_factors for select to authenticated using (user_id = auth.uid());
create policy "export requests are private" on public.data_export_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "deletion requests are private" on public.account_deletion_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No client policies for webhooks, rate-limit counters, review queue mutation, or factor setup.
-- All such operations must be invoked through service functions with verified user identity and permission checks.
