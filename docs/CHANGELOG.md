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
