# Local Environment Template

Create an untracked file named `.env` at the repository root only when you are ready to connect a Supabase project. The two values below are deliberately public client configuration, but their safety depends on the Row Level Security rules in the supplied migration.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Never put `SUPABASE_SERVICE_ROLE_KEY`, Firebase credentials, TURN credentials, CAPTCHA secrets, or webhook secrets in this file. Store those only as Supabase Edge Function secrets or in a server-only environment.
