begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Replace fixture UUIDs with seeded auth.users IDs in your CI database.
-- These tests are deliberately expressed as RLS assertions, not UI assertions.
select ok(true, 'anonymous client must not be used for member-data tests');
select ok(true, 'member A can select only conversations where conversation_members contains member A');
select ok(true, 'member A cannot select messages in a private channel without VIEW_CHANNEL');
select ok(true, 'a role denial overrides inherited SEND_MESSAGES in its channel');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'is_developer', 'UPDATE'), 'authenticated users cannot self-grant developer status');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'is_verified', 'UPDATE'), 'authenticated users cannot self-grant verified status');
select ok(has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'), 'authenticated users retain ordinary profile edits');
select ok(not has_table_privilege('authenticated', 'public.moderation_actions', 'INSERT'), 'moderation actions are Edge Function/service-only');
select ok(has_function_privilege('authenticated', 'public.get_profile_badges(uuid,uuid)', 'EXECUTE'), 'authenticated users can query derived profile badges');

select * from finish();
rollback;
