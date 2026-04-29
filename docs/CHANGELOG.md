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

---

## Sprint 3 — Forms persistence (2026-04-29)

**What changed:**

- **`supabase/migrations/003_forms_table.sql`** — new `forms` table. Schema covers Reference Form (corporate vs individual) and standard forms in one shape. `officer_id` defaults to `auth.uid()` so client INSERTs never need to pass it. RLS policies scope every operation to `officer_id = auth.uid()`. Indexed on `(officer_id, created_at desc)` for fast dashboard queries and on `slug` for direct lookups.
- **`dashboard.html`** — now loads `src/config/{env,supabase-client,constants}.js` before `src/pages/dashboard.js`. Config is centralized; further pages (gtbank-form, gtbank-reference, gtbank-ref-customer) will adopt the same pattern in a later cleanup sprint.
- **`src/pages/dashboard.js`**:
  - `FORM_LIBRARY` now sourced from `window.FP_CONSTANTS.FORM_LIBRARY`. Adding a new bank no longer requires touching dashboard.js.
  - Inline Supabase client init removed. Uses shared `window.fpSupa`.
  - `loadForms()` → `loadCachedForms()`. localStorage is now a read-through cache, NOT source of truth.
  - New `refreshForms()` async fetch from `forms` table; called once on init plus on manual refreshes.
  - New `rowToDashboard()` and `dashboardToRow()` mappers.
  - Generate Link handler (Reference + Standard paths) now ALSO inserts into `forms` table on top of the existing `form_access_codes` insert. RLS auto-scopes the row to the logged-in officer.
  - One-time `backfillIfNeeded()` migrates any legacy localStorage rows to `forms` on first dashboard load (gated by `fp_forms_backfilled` flag).
  - Helpers: `relativeTime()` and `initialsFor()` for view computations.

**Why:**

Officers were stuck on a single-device experience because their form list lived in `localStorage`. Switching browsers or clearing cache wiped their pipeline. With the new `forms` table:
- Forms persist across devices (phone + laptop sync).
- Foundation for analytics (completion rate, drop-off step) and audit log (Sprint 7).
- Multi-tenancy ready: each row carries `officer_id`, so future bank-admin views can aggregate without code changes.

The architectural choice to keep `forms` and `form_access_codes` separate was deliberate — different access patterns (officer-only vs anon-with-brute-force-lockout), different RLS policies, cleaner concerns.

**What did NOT change:**

- `gtbank-form.html`, `gtbank-reference.html`, `gtbank-ref-customer.html` still create their own Supabase clients inline. Will consolidate in a later cleanup sprint — they're working and the risk/reward to touch them now is bad.
- Login/signup/reset-password — still untouched. Auth flow stable.
- `form_access_codes` schema unchanged.

**Action items for you (post-merge):**

1. **Apply migration 003** — Supabase Dashboard → SQL Editor → paste `supabase/migrations/003_forms_table.sql` → Run.
2. **Verify RLS** — run `SELECT * FROM pg_policies WHERE tablename = 'forms';` — should show 4 policies (`officer_select_own`, `officer_insert_own`, `officer_update_own`, `officer_delete_own`).
3. **Test locally**: log in to dashboard. If you had any forms in localStorage, they backfill silently on first load (check console for "backfilled N forms"). Generate a new link → verify it appears in the table → reload page → verify it's still there (proof it came from Supabase, not cache).

---

## Sprint 4 — Design system foundation (2026-04-29)

**What changed:**

- **`src/styles/tokens.css`** — design tokens: warm-tinted neutrals, GTBank orange palette (50–900), 4-pt spacing scale, premium shadow ladder (xs→xl with realistic light source), radius scale, motion timings, z-index layers. Single source of truth — every page-level CSS should consume `var(--fp-*)` instead of hard-coded values.
- **`src/styles/base.css`** — reset, typography defaults (DM Serif Display for headings, DM Sans for body), accessible focus states, `prefers-reduced-motion` support, sensible Lucide defaults.
- **`src/styles/components.css`** — `.fp-btn` (primary/secondary/ghost/danger, sm/lg sizes), `.fp-input/select/textarea` with focus rings, `.fp-card` with hover lift, `.fp-badge` (semantic variants), `.fp-empty` empty-state pattern, `.fp-skeleton` shimmer loader, `.fp-toast`. Class prefix `fp-` to avoid collisions with existing page CSS during incremental migration.
- **`src/lib/icons.js`** — Lucide helper. `window.fpIcons.icon(name, attrs)` returns inline `<i data-lucide>` markup; `window.fpIcons.refresh()` re-scans the DOM after mutations. Auto-runs on DOMContentLoaded.
- **`dashboard.html`** — loads tokens/base/components CSS, Lucide CDN (jsdelivr 0.453.0), DM Sans + DM Serif fonts (added alongside Inter for now during incremental migration), and `src/lib/icons.js`.
- **`dashboard.js`**:
  - **Bug fix:** form-card icons rendered the literal string "user", "building" etc. as text after Sprint 3 wired up FP_CONSTANTS (which uses Lucide names, not emojis). Now renders `<i data-lucide="${icon}">` and calls `fpIcons.refresh()` after innerHTML mutation.
  - **Modal icon** also switched from `textContent = "user"` to inline SVG via `fpIcons.icon()`.
  - **`READY_FORMS`** now sourced from `FP_CONSTANTS.READY_FORMS` instead of inline duplicate.
  - **Empty states** added to `renderRecentForms()` and `renderAllForms()` — uses `.fp-empty` component with Lucide icon + helpful copy. Differentiates "no forms yet" (new officer) from "no matches" (filter active) and shows skeleton-ish "Loading…" state until first DB fetch completes.

**Why:**

Tokens and components are scaffolding for everything that follows. Sprint 5 (UX polish) will refactor existing pages to consume them. Doing the foundation in its own commit means each later sprint can be small, focused, and reviewable. Fixing the icon regression here (rather than in a separate hotfix commit) keeps the changelog honest — that bug only existed because Sprint 1 anticipated this sprint.

**What did NOT change:**

- Existing `src/styles/pages/dashboard.css` and `landing.css` are untouched. They continue to use their own variables (`--gt-orange`, `--muted`, etc.). Migration to tokens is opt-in per page in later sprints.
- Sidebar nav SVG icons in `dashboard.html` — they work fine as inline SVGs. Could swap to Lucide later but no urgency.
- All other HTML pages — Lucide and tokens roll out per-page in upcoming sprints.

**Action items for you:**

1. **Hard-refresh** dashboard after deploy (Ctrl+Shift+R) — fresh CSS files won't be cached.
2. Visual smoke test: log in → "Send form" tab → verify form cards show real icons (not the word "user"). Click a Ready card → modal also shows the icon. "My forms" tab on a fresh login → see the new empty state with the inbox icon.

---

## Sprint 5 — UX polish (loading, confirm, trust) (2026-04-29)

**What changed:**

- **`src/styles/components.css`** — added `.fp-skeleton-pill`, `.fp-skeleton-circle`, `.fp-confirm-overlay/card`, `.fp-trust-banner/row`. Backdrop-blur + pop animation on confirm modal.
- **`src/ui/modal.js`** — new lightweight confirmation modal. `await window.fpModal.confirm({title, message, confirmText, cancelText, danger})`. Lazy DOM build, Esc cancels, Enter confirms, click-outside dismisses. No dependencies beyond Lucide.
- **`dashboard.html`** — loads `src/ui/modal.js`.
- **`src/pages/dashboard.js`**:
  - **Skeleton rows** while forms load. `renderRecentForms()` and `renderAllForms()` now show shimmering skeleton placeholders when `_formsLoaded` is false. Once data arrives, real rows replace them.
  - **`resendForm()`** is now async + uses `fpModal.confirm()` instead of silently mutating state. Confirmed resends update the `forms` table in Supabase (status → pending), then optimistically update local state.
  - **Bug fix:** the 5-second polling interval was calling the removed `loadForms()` function (renamed to `loadCachedForms()` in Sprint 3). It now calls `refreshForms()` every 30 seconds (longer interval — Supabase calls cost more than localStorage reads) and detects newly-completed forms by diffing `sessionId:status` strings.

**Why:**

Skeletons feel premium and tell the user "something's coming" instead of a blank table that looks broken. Confirmation on resend prevents accidental refreshes. The polling fix means no more silent crashes when a form completes — that was a Sprint 3 regression I introduced when renaming `loadForms`.

**What did NOT change (deferred):**

- `gtbank-reference.html` trust banner — `.fp-trust-banner` CSS exists, but applying it cleanly requires reading 800+ lines of that page. Deferred to a focused customer-form polish sprint.
- PDF preview before download — needs significant pdf-lib → image rendering work; not a quick win.
- Mobile-first dashboard refinement — needs real device testing, not just CSS guesses.
