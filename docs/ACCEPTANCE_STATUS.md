# LumaLink Acceptance Status

This document is the implementation baseline for the Supabase-backed source. A feature is marked **Live after deployment** only when the mobile client invokes it against an applied migration and deployed Edge Function. A feature marked **Provider required** is intentionally disabled rather than simulated.

| Requirement group | Status | Evidence / boundary |
|---|---|---|
| Email/password auth, recovery, sessions, age/policy acceptance | Live after deployment | `app/auth.tsx`, `lib/luma/context.tsx`, Supabase Auth configuration. Email confirmation behavior is controlled in the Supabase dashboard. |
| Profile, settings, presence, badges, shared spaces | Live after deployment | Direct RLS reads/writes plus `get_profile_badges` RPC and realtime `presence` subscription. |
| Servers, categories, text/voice channels, roles, invites | Live after deployment | `manage-community` function and `20260822152000_live_product_integrations.sql`. |
| DMs, group DMs, messages, reactions, edit/delete, report, thread navigation | Live after deployment | Direct RLS data actions; group creation uses `create-conversation` function. |
| Message pins | Live after deployment | Authorized `manage-community` function, not a client-side protected-table write. |
| Friend requests and blocks | Live after deployment | RLS-backed `friendships` and `blocks` mutations in `LumaProvider`. |
| Moderator review outcomes and audit log | Live after deployment | `moderate-report` function verifies moderator authority and target-server scope. |
| Search | Live after deployment | RLS-respecting live `profiles` and `messages` queries in `app/search.tsx`. |
| In-app notifications and device registration | Live after deployment | Private `notifications` query, `register-device-token` function, Android permission/channel setup. |
| FCM delivery | Deploy-gated | `notify-event` needs `FCM_PROJECT_ID` and `FCM_SERVICE_ACCOUNT_JSON` set in Supabase Edge Function secrets and Firebase native configuration. |
| Attachments and image/file uploads | Live after deployment | Native document picker uploads up to 25 MB into the private `attachments` bucket; `attach-message` verifies message ownership before writing attachment metadata. Apply `20260822153000_message_storage.sql` and deploy the function. |
| Audio/video calls | Provider required | The UI never fakes a call. A WebRTC provider, room-access token function, TURN policy, and call audit lifecycle must be configured first. |
| GitHub APK | Ready in GitHub | GitHub Actions workflow builds and uploads a debug APK. It runs when this source is pushed to a repository. |

## Required deployment sequence

Run `supabase db push`, deploy all functions under `supabase/functions/`, set the FCM secrets if push delivery is needed, and enable each relevant table for Supabase Realtime. Run `supabase/tests/deployment_verification.sql` and the pgTAP suite after migration deployment. The app is deliberately explicit when a third-party provider is not configured; it does not claim that missing FCM, Storage, or WebRTC features are live.
