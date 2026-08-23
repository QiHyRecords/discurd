-- LumaLink core schema. Apply with `supabase db push` from a linked Supabase project.
-- The app client must use only the anonymous key. Service-role credentials belong in Edge Functions only.

create extension if not exists pgcrypto;

create type public.channel_kind as enum ('text', 'voice');
create type public.conversation_kind as enum ('direct', 'group');
create type public.presence_state as enum ('online', 'idle', 'dnd', 'offline');
create type public.notification_kind as enum ('message', 'mention', 'friend_request', 'call', 'server', 'thread', 'system');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_path text,
  status_text text not null default '' check (char_length(status_text) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  appearance text not null default 'system' check (appearance in ('system', 'light', 'dark')),
  reduce_motion boolean not null default false,
  compact_mode boolean not null default false,
  dm_notification_level text not null default 'all' check (dm_notification_level in ('all', 'mentions', 'none')),
  locale text not null default 'en',
  updated_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.servers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  icon_path text,
  is_discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text check (char_length(nickname) <= 80),
  joined_at timestamptz not null default now(),
  timeout_until timestamptz,
  primary key (server_id, user_id)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text,
  priority integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (server_id, name),
  unique (server_id, priority)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission text not null check (permission in ('VIEW_CHANNEL', 'SEND_MESSAGES', 'EDIT_MESSAGES', 'DELETE_MESSAGES', 'ATTACH_FILES', 'ADD_REACTIONS', 'MENTION_EVERYONE', 'CREATE_THREADS', 'SEND_IN_THREADS', 'MANAGE_CHANNELS', 'MANAGE_SERVER', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MODERATE_MEMBERS', 'CONNECT', 'SPEAK', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS')),
  primary key (role_id, permission)
);

create table public.member_roles (
  server_id uuid not null,
  user_id uuid not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (server_id, user_id, role_id),
  foreign key (server_id, user_id) references public.server_members(server_id, user_id) on delete cascade
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  position integer not null default 0,
  unique (server_id, position)
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (name ~ '^[a-z0-9-]{1,80}$'),
  kind public.channel_kind not null default 'text',
  description text not null default '' check (char_length(description) <= 240),
  position integer not null default 0,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  unique (server_id, name)
);

create table public.channel_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  role_id uuid references public.roles(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  permission text not null,
  allow boolean not null,
  check ((role_id is null) <> (member_id is null)),
  unique nulls not distinct (channel_id, role_id, member_id, permission)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  title text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  notification_level text not null default 'all' check (notification_level in ('all', 'mentions', 'none')),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  parent_message_id uuid references public.messages(id) on delete set null,
  body text not null default '' check (char_length(body) <= 4000),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check ((channel_id is null) <> (conversation_id is null)),
  check (body <> '' or deleted_at is not null)
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 128),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 255),
  content_type text not null,
  byte_size bigint not null check (byte_size between 1 and 26214400),
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create table public.read_states (
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  updated_at timestamptz not null default now(),
  check ((channel_id is null) <> (conversation_id is null)),
  unique nulls not distinct (user_id, channel_id, conversation_id)
);

create table public.presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state public.presence_state not null default 'offline',
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 500),
  target_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  code text not null unique check (code ~ '^[A-Za-z0-9_-]{6,32}$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  message_id uuid references public.messages(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  server_id uuid references public.servers(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  started_by uuid not null references public.profiles(id) on delete restrict,
  provider_room_id text not null unique,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check ((channel_id is null) <> (conversation_id is null))
);

create table public.call_participants (
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  muted boolean not null default false,
  deafened boolean not null default false,
  primary key (call_id, user_id)
);

create index messages_channel_created_idx on public.messages(channel_id, created_at desc) where channel_id is not null;
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc) where conversation_id is not null;
create index messages_parent_idx on public.messages(parent_message_id) where parent_message_id is not null;
create index server_members_user_idx on public.server_members(user_id, server_id);
create index channels_server_category_idx on public.channels(server_id, category_id, position);
create index notifications_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index reports_server_status_idx on public.reports(server_id, status, created_at desc);
create index invites_server_idx on public.invites(server_id, created_at desc);
create index message_search_idx on public.messages using gin (to_tsvector('simple', body));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger user_settings_touch_updated_at before update on public.user_settings for each row execute function public.touch_updated_at();
create trigger servers_touch_updated_at before update on public.servers for each row execute function public.touch_updated_at();

create or replace function public.is_server_member(target_server uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.server_members where server_id = target_server and user_id = auth.uid());
$$;

create or replace function public.has_server_permission(target_server uuid, requested_permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.member_roles mr
    join public.role_permissions rp on rp.role_id = mr.role_id
    where mr.server_id = target_server and mr.user_id = auth.uid() and rp.permission = requested_permission
  ) or exists (select 1 from public.servers where id = target_server and owner_id = auth.uid());
$$;

create or replace function public.has_channel_permission(target_channel uuid, requested_permission text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare target_server uuid; has_deny boolean; has_allow boolean;
begin
  select server_id into target_server from public.channels where id = target_channel;
  if target_server is null or not public.is_server_member(target_server) then return false; end if;
  select exists(
    select 1 from public.channel_permission_overrides cpo
    where cpo.channel_id = target_channel and cpo.permission = requested_permission and cpo.allow = false
      and (cpo.member_id = auth.uid() or cpo.role_id in (select role_id from public.member_roles where server_id = target_server and user_id = auth.uid()))
  ) into has_deny;
  if has_deny then return false; end if;
  select exists(
    select 1 from public.channel_permission_overrides cpo
    where cpo.channel_id = target_channel and cpo.permission = requested_permission and cpo.allow = true
      and (cpo.member_id = auth.uid() or cpo.role_id in (select role_id from public.member_roles where server_id = target_server and user_id = auth.uid()))
  ) into has_allow;
  return has_allow or public.has_server_permission(target_server, requested_permission);
end; $$;

create or replace function public.can_access_conversation(target_conversation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = target_conversation and user_id = auth.uid());
$$;

create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, lower(coalesce(new.raw_user_meta_data ->> 'username', 'member_' || substr(new.id::text, 1, 8))), coalesce(new.raw_user_meta_data ->> 'display_name', 'New member'));
  insert into public.user_settings (user_id) values (new.id);
  insert into public.presence (user_id) values (new.id);
  return new;
end; $$;
create trigger auth_user_profile after insert on auth.users for each row execute procedure public.create_profile();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.blocks enable row level security;
alter table public.friendships enable row level security;
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.member_roles enable row level security;
alter table public.categories enable row level security;
alter table public.channels enable row level security;
alter table public.channel_permission_overrides enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_attachments enable row level security;
alter table public.read_states enable row level security;
alter table public.presence enable row level security;
alter table public.notifications enable row level security;
alter table public.device_tokens enable row level security;
alter table public.invites enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.calls enable row level security;
alter table public.call_participants enable row level security;

create policy "authenticated profiles are readable" on public.profiles for select to authenticated using (true);
create policy "profiles update themselves" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "settings are private" on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "blocks are private" on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "friendships visible to participants" on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friends create own requests" on public.friendships for insert to authenticated with check (requester_id = auth.uid());
create policy "friends respond as addressee" on public.friendships for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());

create policy "members or discovery can read servers" on public.servers for select to authenticated using (is_discoverable or public.is_server_member(id));
create policy "members read server members" on public.server_members for select to authenticated using (public.is_server_member(server_id));
create policy "members read roles" on public.roles for select to authenticated using (public.is_server_member(server_id));
create policy "members read role permissions" on public.role_permissions for select to authenticated using (exists (select 1 from public.roles r where r.id = role_id and public.is_server_member(r.server_id)));
create policy "members read member roles" on public.member_roles for select to authenticated using (public.is_server_member(server_id));
create policy "members read categories" on public.categories for select to authenticated using (public.is_server_member(server_id));
create policy "members read permitted channels" on public.channels for select to authenticated using (public.has_channel_permission(id, 'VIEW_CHANNEL'));
create policy "members read channel overrides" on public.channel_permission_overrides for select to authenticated using (public.has_channel_permission(channel_id, 'VIEW_CHANNEL'));

create policy "conversation members read conversations" on public.conversations for select to authenticated using (public.can_access_conversation(id));
create policy "conversation members read membership" on public.conversation_members for select to authenticated using (public.can_access_conversation(conversation_id));
create policy "members read permitted messages" on public.messages for select to authenticated using ((channel_id is not null and public.has_channel_permission(channel_id, 'VIEW_CHANNEL')) or (conversation_id is not null and public.can_access_conversation(conversation_id)));
create policy "users send permitted messages" on public.messages for insert to authenticated with check (author_id = auth.uid() and ((channel_id is not null and public.has_channel_permission(channel_id, 'SEND_MESSAGES')) or (conversation_id is not null and public.can_access_conversation(conversation_id))));
create policy "authors edit own messages" on public.messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete own messages" on public.messages for delete to authenticated using (author_id = auth.uid());
create policy "members read reactions" on public.message_reactions for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id and ((m.channel_id is not null and public.has_channel_permission(m.channel_id, 'VIEW_CHANNEL')) or (m.conversation_id is not null and public.can_access_conversation(m.conversation_id)))));
create policy "members react in permitted messages" on public.message_reactions for insert to authenticated with check (user_id = auth.uid());
create policy "users remove own reactions" on public.message_reactions for delete to authenticated using (user_id = auth.uid());
create policy "members read permitted attachments" on public.message_attachments for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id and ((m.channel_id is not null and public.has_channel_permission(m.channel_id, 'VIEW_CHANNEL')) or (m.conversation_id is not null and public.can_access_conversation(m.conversation_id)))));
create policy "users manage own read states" on public.read_states for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "presence readable to authenticated" on public.presence for select to authenticated using (true);
create policy "users update own presence" on public.presence for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications are private" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "device tokens are private" on public.device_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members read active invites" on public.invites for select to authenticated using (public.is_server_member(server_id));
create policy "users create reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reporters read own reports" on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy "members read accessible calls" on public.calls for select to authenticated using ((channel_id is not null and public.has_channel_permission(channel_id, 'CONNECT')) or (conversation_id is not null and public.can_access_conversation(conversation_id)));
create policy "participants read their calls" on public.call_participants for select to authenticated using (user_id = auth.uid());

-- No direct client policies are provided for server, role, invite, report-review, or audit-log administration.
-- Use Edge Functions with a service role and explicit authorization checks for those sensitive mutations.
