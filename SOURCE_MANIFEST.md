# Source Manifest

This source-only project package is intentionally clean. It contains mobile source, native Android project files, Supabase migrations/functions/tests, GitHub Actions workflow, assets, and written deployment guidance. It excludes dependency directories, build products, cache directories, historical large archives, generated local SQLite state, and unrelated starter-server code.

| Path | Purpose |
|---|---|
| `app/`, `components/`, `lib/luma/` | Expo Router screens, native UI primitives, Supabase client, session provider, realtime behavior, and app domain adapters. |
| `supabase/migrations/` | Ordered Postgres schema, RLS, policy, rate-limit, governance, live-flow, and badge migrations. |
| `supabase/functions/` | Authenticated Edge Functions for messages, community management, device-token registration, notifications, moderation, exports, and invitations. |
| `supabase/tests/` | pgTAP authorization assertions and deployment verification script. |
| `tests/` | Type-safe local unit tests for permissions, badges, and public Supabase configuration. |
| `.github/workflows/android-apk.yml` | GitHub-hosted debug APK build and artifact upload workflow. |
| `docs/` | Supabase, FCM, GitHub Actions, Android, production hardening, and acceptance documentation. |

> `node_modules/`, `android/.gradle/`, `android/app/build/`, `.expo/`, and prior `.zip` deliveries are deliberately excluded: they are reproducible dependencies or build artifacts, not source code.
