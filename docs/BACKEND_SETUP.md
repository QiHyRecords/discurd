# Supabase Deployment Setup

LumaLink uses Supabase directly. There is no MySQL, Drizzle, tRPC, Express, or starter server to configure.

## Public mobile configuration

Set these two public Expo variables in the development and production environment. The anonymous key is designed for mobile distribution; security comes from the included Row Level Security policies and Edge Function authorization.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Apply schema and deploy functions

Apply every migration in order, then deploy the functions:

```bash
supabase db push
for fn in create-conversation manage-community redeem-invite send-message moderate-report notify-event request-data-export register-device-token attach-message; do
  supabase functions deploy "$fn"
done
```

Enable Realtime replication for `messages`, `notifications`, `typing_indicators`, and `presence`. The mobile provider refetches authorized data after each realtime event; it does not subscribe to another user’s private data.

## Firebase Cloud Messaging

Native Android push delivery needs Firebase configured in the Android project and these **Supabase Edge Function secrets**, never a mobile-app secret:

```bash
supabase secrets set FCM_PROJECT_ID=your-firebase-project-id
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

The client asks for permission only when the user enables notifications in Settings, creates the Android channel first, obtains a native FCM token, and invokes `register-device-token`. `notify-event` honors account/server/channel notification preferences and deactivates tokens that Firebase reports as invalid.

## Verify

Run `supabase/tests/deployment_verification.sql` in the SQL editor, then execute the pgTAP suite if your project exposes it. On a physical Android development or release build: sign up, create a space, create a group conversation, send a message, request a data export, enable notifications, and verify the matching RLS rows through the Supabase dashboard. Do not test native remote notifications in Expo Go.

## Providers deliberately left external

FCM Firebase credentials and a WebRTC call provider are deployment choices. The included message-attachment migration creates a private Storage bucket and policies; it must be applied before attachments are enabled. The app does not use static credentials or simulate missing providers. See `docs/ACCEPTANCE_STATUS.md` for each capability boundary.
