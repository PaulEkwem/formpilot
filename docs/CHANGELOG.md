# Changelog

Sprint-by-sprint summary of what changed and why.

## Sprint 1 — Project restructure (2026-04-28)

**What changed:**
- Created `src/{config,lib,pages,ui,styles}` hierarchy
- Moved `assets/js/dashboard.js` → `src/pages/dashboard.js`
- Moved `assets/js/form-engine.js` → `src/lib/form-engine.js`
- Moved `assets/css/*` → `src/styles/pages/*`
- Moved `supabase-setup.sql` → `supabase/migrations/001_initial_schema.sql`
- Archived stale `form.html` and root-level `form-engine.js` (138 KB old version)
- Added centralized config: `src/config/{env,supabase-client,constants}.js`
- Added `package.json`, `.env.example`, comprehensive `.gitignore`
- Added `docs/{ARCHITECTURE,SECURITY,DEPLOYMENT,CHANGELOG}.md`
- Updated all 10 HTML asset references to new paths
- Updated `README.md` to reflect real project structure (was still describing the old pre-FormPilot prototype)

**Why:**
Foundation for all later sprints. Centralization means Sprint 2 (security) doesn't have to chase secrets across 7 HTML files. Migrations folder enables Sprint 3 (forms-table). Docs folder gives future-you the why.

**What did NOT change:**
- HTML files stay at project root → no Vercel routing changes → existing customer links still work
- No logic changes in any JS file
- Supabase client init still happens inline in HTML files (Sprint 2 will migrate them to use `src/config/supabase-client.js`)

**Migration debt:**
- `login.html`, `signup.html`, `dashboard.html` still create their own Supabase clients. Sprint 2 consolidates.
- `dashboard.js` still has hardcoded `FORM_LIBRARY` and Supabase URL. Sprint 2 migrates to use `FP_CONSTANTS` and `fpSupa`.

---

## Sprint 2 — Security Foundation (2026-04-29)

**What changed:**

- **vercel.json** — added Content-Security-Policy with strict allowlist, Strict-Transport-Security (HSTS, 1-year + preload), Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy. Tightened Referrer-Policy from `no-referrer` to `strict-origin-when-cross-origin`. Added `usb=()` and `interest-cohort=()` to Permissions-Policy.
- **EmailJS removed** — `gtbank-form.html` no longer loads `@emailjs/browser` SDK or initializes with the public key. Co-signatory invite emails now route through `src/lib/email.js` → Supabase Edge Function `send-email` → Brevo SMTP.
- **`src/lib/email.js`** — new browser-side helper. Returns `{ ok, id|error }`, never throws. Reuses `window.FP_ENV` for the function URL.
- **dashboard.js** — removed 10 fake `DEFAULT_FORMS` records. New officers now see an empty state until their first link. Added `_generating` idempotency guard on the Generate Link button (prevents double-click duplicate-slug bugs).
- **SRI hashes** — added `integrity="sha384-…"` + `crossorigin="anonymous"` to the 3 ungated CDN scripts: `fill.html` (pdf-lib), `gtbank-reference.html` (pdf.js), `pdf-coord-picker.html` (pdf.js).
- **`supabase/migrations/002_rls_lockdown.sql`** — default-deny RLS for every public.* table. Re-asserts `form_access_codes` policies. Sketches `forms` schema for Sprint 3.
- **docs/SECURITY.md** — finalized header table + RLS map.

**Why:**

The `anon` Supabase key is public by design — security depends entirely on RLS. Migration 002 makes "no policy = no access" the default for any new table, so we can't accidentally ship a leaky table. CSP + SRI close the supply-chain risk: even if a CDN is compromised, the browser refuses tampered bytes (SRI) and blocks any beaconing to non-allowlisted hosts (CSP). EmailJS removal eliminates the only client-side third-party API key in the codebase — Brevo creds now live in Supabase Edge Function secrets where they belong.

**What did NOT change:**

- `login.html`, `signup.html`, `reset-password.html` auth flows — left alone while you debug the email-not-arriving issue. Migrating them now would compound the troubleshooting.
- `dashboard.js` Supabase init still inline. Will consolidate in Sprint 3 alongside the `forms` table migration.

**Action items for you (post-merge):**

1. **Apply migration 002** — Supabase Dashboard → SQL Editor → paste `supabase/migrations/002_rls_lockdown.sql` → Run. Then run the audit query at the top to confirm every table has `rowsecurity = true`.
2. **Deploy `send-email` Edge Function** — `supabase functions deploy send-email` (or Dashboard → Edge Functions → New from local).
3. **Set Edge Function secrets** — `BREVO_API_KEY` and `SENDER_EMAIL` in Supabase Dashboard → Edge Functions → Secrets. Without these, the gtbank-form.html co-signatory email won't send (the link is still created — same fallback behavior as before).
4. **(Optional) Cancel EmailJS account** — no longer used.
5. **(Optional) Hard-refresh production** after deploy — old cached `assets/css/*.css` may 404 briefly until cache TTL expires.
