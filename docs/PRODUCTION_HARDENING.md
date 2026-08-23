# LumaLink Production Hardening

The mobile interface uses direct Supabase-backed session, profile, community, message, relationship, report, notification, and preference data. Before public release, apply every migration, deploy every Edge Function, validate Row Level Security against real fixtures, configure FCM credentials, and complete a WebRTC provider integration before enabling calling controls.

| Capability | Production implementation boundary | Included starting point |
|---|---|---|
| Consent and age gate | Persist accepted policy versions during signup; block account completion until present. | `account_consents` and the account screen. |
| Message actions | Enforce author/moderator rights in RLS or a privileged function; broadcast accepted mutations. | Live message edit/delete/reaction flow, authorized pins, attachment function, and message policies. |
| Invite links | Verify code, expiry, revocation, use count, membership, and rate limits in a transactional RPC. | `redeem_invite` RPC and Edge Function template. |
| Moderator queue | Allow reports from affected users; authorize review actions by server permission and write an audit record. | `reports`, queue UI, and moderation template. |
| Data rights | Queue an export, create a short-lived archive, and honor account deletion retention rules server-side. | Export request table and function template. |
| 2FA and sessions | Store factor secrets encrypted and make session revocation invalidate server tokens. | Security UI and session/factor tables. |
| Push and deep links | Register device tokens, honor preferences, deliver through FCM, and validate every target on app open. | Native token registration, notification function, foreground handling, and Android scheme configuration. |

## Realtime and Lifecycle

Keep subscriptions narrow: subscribe to the visible conversation/channel and user-specific notification stream only. When an app backgrounds, unsubscribe ephemeral typing/presence channels; when it returns, refetch messages after the last durable read marker before resubscribing. The `lib/luma/realtime.ts` interface documents this boundary without embedding any privileged credentials.

## Release Gate

Before internal testing, apply all migrations to an isolated project, run fixture-backed pgTAP RLS tests, configure Firebase credentials as server secrets, and run a signed Android build in GitHub Actions or Android Studio. Do not ship 2FA or WebRTC controls until their provider-specific authorization and audit paths are live.
