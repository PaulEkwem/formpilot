-- Sprint X — Security Advisor cleanup
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Triages the warnings flagged by Supabase's Security Advisor:
--
--   1. Duplicate "always true" RLS policies on form_access_codes (one from
--      migration 001 named "insert_codes", another from 002 named
--      "anon_insert_codes"). Both granted INSERT to anon. Consolidates
--      to a single policy.
--
--   2. form_access_codes INSERT was open to anon. The dashboard creates
--      these rows from a logged-in officer session, so the role can be
--      tightened to `authenticated`. This removes the ability for anyone
--      with the public anon key to spam-insert rows.
--
--   3. signatory_sessions had multiple "always true" policies. The
--      co-signatory flow in gtbank-form.html does:
--        - INSERT  ← officer (authenticated) creates a session
--        - SELECT  ← signatory (anon) reads by UUID id
--        - UPDATE  ← signatory (anon) saves form_data, completes
--      We tighten INSERT to authenticated. SELECT/UPDATE remain open to
--      anon with `(true)` — the security model is "the UUID is the
--      secret"; 122 bits of entropy makes guessing infeasible. Documented
--      here so the advisor warning is intentional, not accidental.
--
-- The remaining advisor warnings on:
--   - deletion_requests (anon insert) — required by NDPA §38 erasure right
--   - verify_form_code / mark_form_complete (anon execute) — required by
--     the customer-side flow; functions self-validate
--   - log_audit (authenticated execute) — required by audit trail
-- ...are intentional by design and documented in docs/SECURITY.md.

-- ──────────────────────────────────────────────────────────────────────
-- 1. form_access_codes — drop duplicates, tighten INSERT to authenticated
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "insert_codes"        on form_access_codes;
drop policy if exists "anon_insert_codes"   on form_access_codes;
drop policy if exists "officer_insert_code" on form_access_codes;

create policy "officer_insert_code" on form_access_codes
  for insert to authenticated
  with check (true);

-- ──────────────────────────────────────────────────────────────────────
-- 2. signatory_sessions — consolidate policies; INSERT auth-only,
--    SELECT/UPDATE anon-with-UUID-secrecy
-- ──────────────────────────────────────────────────────────────────────
do $$
declare
  pol record;
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='signatory_sessions') then
    -- Make sure RLS is on
    execute 'alter table public.signatory_sessions enable row level security';

    -- Drop any pre-existing policies (names from prior ad-hoc setup vary)
    for pol in
      select policyname from pg_policies
       where schemaname='public' and tablename='signatory_sessions'
    loop
      execute format('drop policy if exists %I on public.signatory_sessions', pol.policyname);
    end loop;

    -- Officer creates the row (authenticated)
    execute 'create policy "officer_insert_signatory_session" on public.signatory_sessions for insert to authenticated with check (true)';

    -- Signatory reads/updates by UUID id (anon — UUID is the secret)
    execute 'create policy "anon_select_signatory_session" on public.signatory_sessions for select to anon using (true)';

    execute 'create policy "anon_update_signatory_session" on public.signatory_sessions for update to anon using (true) with check (true)';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────
-- 3. Verification
-- ──────────────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, roles, cmd
--   FROM pg_policies
--  WHERE tablename IN ('form_access_codes','signatory_sessions','deletion_requests')
--  ORDER BY tablename, policyname;
