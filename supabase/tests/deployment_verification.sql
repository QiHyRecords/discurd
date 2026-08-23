-- Run in the Supabase SQL editor after all migrations are applied.
-- It verifies required schema and RLS are present without exposing records.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'servers', 'channels', 'messages', 'friendships', 'blocks', 'reports', 'notifications', 'device_tokens', 'typing_indicators', 'audit_log')
order by table_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('messages', 'server_members', 'friendships', 'blocks', 'reports', 'notifications', 'device_tokens', 'typing_indicators')
order by tablename;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('consume_rate_limit', 'redeem_invite', 'get_profile_badges', 'is_server_moderator')
order by routine_name;
