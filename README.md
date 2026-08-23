# LumaLink

LumaLink is an Android-first Expo community application that uses **Supabase Auth, Postgres, Row Level Security, Realtime, Storage-ready data models, and Edge Functions** directly from the mobile client. The repository intentionally contains no MySQL, Drizzle, tRPC, Express, or starter server scaffold.

## What is included

| Area | Implementation |
|---|---|
| Authentication | Email/password sign-up, sign-in, recovery, persisted SecureStore session, policy and age acceptance. |
| Community | Servers, categories, channels, roles, invitations, members, and permission-gated management via Supabase Edge Functions. |
| Messaging | Direct and group conversations, channel messages, reactions, editing, deletion, threads, reports, pinned server messages, typing indicators, and database realtime subscriptions. |
| Social | Friend requests, accept/decline, blocks, profiles, shared spaces, role-derived badges, presence, and user settings. |
| Safety | RLS migrations, report queue, authorized moderation function, rate limits, audit records, data export requests, and account deletion requests. |
| Notifications | Private in-app notification feed, Android native token registration, FCM HTTP v1 delivery function, preference filtering, and notification deep links. |
| Builds | `.github/workflows/android-apk.yml` runs type checks, tests, and creates a debug APK artifact on GitHub-hosted Android runners. |

## Run locally

1. Copy `.env.example` to `.env` and set only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. Apply the migrations and deploy Edge Functions using `docs/BACKEND_SETUP.md`.
3. Install packages with `pnpm install` and start the Android client with `pnpm android` or `pnpm dev`.
4. Use a development build or release APK for native FCM tokens; remote push notifications do not work in Expo Go on Android SDK 53+.

Read `SOURCE_MANIFEST.md` for the intentionally tracked project contents and `docs/ACCEPTANCE_STATUS.md` for live, deploy-gated, and provider-required functionality.
