# Deployment

## Production

Push to `main` on GitHub → Vercel auto-deploys to https://formpilot-five.vercel.app.

That's it. No CI/CD pipeline yet (Sprint 6 adds GitHub Actions).

## Vercel configuration

Project: `formpilot-five` on Vercel.

Settings → Environment Variables (production):

| Key | Value | Where used |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-…` | Supabase Edge Function `send-email` |
| `SENDER_EMAIL` | `hello@formpilot.app` | Supabase Edge Function `send-email` |

> Wait — Vercel doesn't run Supabase Edge Functions. Those env vars actually live in Supabase Dashboard → Edge Functions → Secrets. Vercel env vars are only needed if/when we add server-side Vercel routes.

## Supabase

Project: `dlpbnucipzudsrsbvodp`.

To apply schema changes in order:

```bash
# Manually paste each migration in order via Supabase SQL Editor
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_… (Sprint 3)
```

Once we adopt the Supabase CLI properly (Sprint 6), this becomes:

```bash
supabase db push
```

## Edge Functions

Deploy `send-email`:

```bash
supabase functions deploy send-email
supabase secrets set BREVO_API_KEY=xkeysib-...
supabase secrets set SENDER_EMAIL=hello@formpilot.app
```

## Rollback

If a deploy is broken:

1. Vercel Dashboard → Deployments → find last good deploy → "Promote to Production"
2. OR: `git revert <bad-sha> && git push origin main`

For DB changes, rollback requires writing a counter-migration (Postgres has no automatic undo).

## Domain

Currently on the free Vercel subdomain (`formpilot-five.vercel.app`). To move to a custom domain (`formpilot.app`):

1. Buy domain
2. Vercel → Domains → Add → follow DNS prompts
3. Update `APP_BASE_URL` in `src/config/env.js`
4. Update Supabase Auth → URL Configuration with the new redirect URLs
5. Update `signup.html` and `login.html` `emailRedirectTo` and `redirectTo` strings
