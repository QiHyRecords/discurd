-- Private message attachment bucket. Object reads are permission-checked against the linked message.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

create or replace function public.can_read_attachment_path(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.message_attachments a
    join public.messages m on m.id = a.message_id
    where a.storage_path = object_name
      and ((m.channel_id is not null and public.has_channel_permission(m.channel_id, 'VIEW_CHANNEL'))
        or (m.conversation_id is not null and public.can_access_conversation(m.conversation_id)))
  );
$$;

drop policy if exists "attachment uploads require owner prefix" on storage.objects;
drop policy if exists "attachment reads require message access" on storage.objects;
drop policy if exists "attachment owners delete own objects" on storage.objects;
create policy "attachment uploads require owner prefix" on storage.objects for insert to authenticated with check (
  bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "attachment reads require message access" on storage.objects for select to authenticated using (
  bucket_id = 'attachments' and public.can_read_attachment_path(name)
);
create policy "attachment owners delete own objects" on storage.objects for delete to authenticated using (
  bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
);
