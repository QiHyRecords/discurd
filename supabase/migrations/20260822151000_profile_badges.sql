-- Account-level developer/verified badges plus secure role-derived badge lookup.
-- Apply after 20260822150000_backend_enforcement.sql.

alter table public.profiles add column is_developer boolean not null default false;
alter table public.profiles add column is_verified boolean not null default false;

-- The existing self-update policy remains useful for profile edits, but table-level
-- UPDATE grants would otherwise allow a client to set every profile column.
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_path, status_text) on public.profiles to authenticated;

create or replace function public.get_profile_badges(target_user uuid, target_server uuid default null)
returns table(badge text, sort_order integer)
language sql stable security definer set search_path = public as $$
  with badge_rows as (
    select 'owner'::text as badge, 1 as sort_order
    where target_server is not null and exists (
      select 1 from public.servers s where s.id = target_server and s.owner_id = target_user
    )
    union all
    select 'admin'::text, 2
    where target_server is not null and exists (
      select 1
      from public.member_roles mr
      join public.role_permissions rp on rp.role_id = mr.role_id
      where mr.server_id = target_server
        and mr.user_id = target_user
        and rp.permission in ('MANAGE_SERVER', 'MANAGE_ROLES')
    )
    union all
    select 'developer'::text, 3
    where exists (select 1 from public.profiles p where p.id = target_user and p.is_developer)
    union all
    select 'verified'::text, 4
    where exists (select 1 from public.profiles p where p.id = target_user and p.is_verified)
  )
  select badge, sort_order from badge_rows order by sort_order;
$$;

grant execute on function public.get_profile_badges(uuid, uuid) to authenticated;

-- There is deliberately no client INSERT/UPDATE policy or column grant for
-- is_developer/is_verified. A service-role administration process owns them.
