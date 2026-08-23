-- Live mobile product support: shared pins and ephemeral typing state.
-- Apply after the core, governance, backend enforcement, and badge migrations.

create table public.message_pins (
  message_id uuid primary key references public.messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.typing_indicators (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  check ((conversation_id is null) <> (channel_id is null)),
  unique nulls not distinct (conversation_id, channel_id, user_id)
);

create index message_pins_created_idx on public.message_pins(created_at desc);
create index typing_indicators_expiry_idx on public.typing_indicators(expires_at);

alter table public.message_pins enable row level security;
alter table public.typing_indicators enable row level security;

create policy "visible-message pins are readable" on public.message_pins for select to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and ((m.channel_id is not null and public.has_channel_permission(m.channel_id, 'VIEW_CHANNEL')) or (m.conversation_id is not null and public.can_access_conversation(m.conversation_id))))
);
create policy "participants read active typing" on public.typing_indicators for select to authenticated using (
  expires_at > now() and ((channel_id is not null and public.has_channel_permission(channel_id, 'VIEW_CHANNEL')) or (conversation_id is not null and public.can_access_conversation(conversation_id)))
);
create policy "participants write own typing" on public.typing_indicators for all to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and expires_at <= now() + interval '30 seconds' and ((channel_id is not null and public.has_channel_permission(channel_id, 'SEND_MESSAGES')) or (conversation_id is not null and public.can_access_conversation(conversation_id)))
);

-- Pin/unpin is deliberately server-only because server permissions and message
-- location must be checked atomically by the manage-community Edge Function.
