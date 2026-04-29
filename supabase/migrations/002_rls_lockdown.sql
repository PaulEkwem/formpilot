-- Sprint 2 — RLS lockdown
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Goal: ensure no table is readable by `anon` role except via explicit policies.
-- Anything not covered here remains denied by default once RLS is enabled.

-- ──────────────────────────────────────────────────────────────────────
-- 1. Audit query — run first to see what tables exist & their RLS state
-- ──────────────────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, rowsecurity
-- FROM   pg_tables
-- WHERE  schemaname = 'public'
-- ORDER  BY tablename;

-- ──────────────────────────────────────────────────────────────────────
-- 2. form_access_codes — already has RLS from migration 001.
--    Re-assert here for clarity. Anon may INSERT, never SELECT.
--    Verification reads happen via verify_form_code() (SECURITY DEFINER).
-- ──────────────────────────────────────────────────────────────────────
alter table if exists form_access_codes enable row level security;

drop policy if exists "anon_insert_codes" on form_access_codes;
create policy "anon_insert_codes" on form_access_codes
  for insert to anon
  with check (true);

drop policy if exists "anon_no_select" on form_access_codes;
-- (no SELECT policy means SELECT is denied — that's the goal)

-- ──────────────────────────────────────────────────────────────────────
-- 3. signatory_sessions — used by gtbank-form.html for co-signatory flow
--    (referenced by `gtb_sessions` insert at line ~2750 of gtbank-form.html)
--    Officer creates the session; signatory updates it via session_id +
--    a per-row token. RLS is enforced by matching the token in WHERE.
--
--    Adjust column names below to match your actual schema.
-- ──────────────────────────────────────────────────────────────────────
-- alter table if exists gtb_sessions enable row level security;
--
-- drop policy if exists "anon_insert_signatory_session" on gtb_sessions;
-- create policy "anon_insert_signatory_session" on gtb_sessions
--   for insert to anon with check (true);
--
-- drop policy if exists "anon_select_own_session" on gtb_sessions;
-- create policy "anon_select_own_session" on gtb_sessions
--   for select to anon
--   using (session_id = current_setting('request.jwt.claims', true)::json->>'session_id');
--
-- (Customize once we know the exact schema — Sprint 3 will codify this.)

-- ──────────────────────────────────────────────────────────────────────
-- 4. forms — Sprint 3 introduces this table. Schema sketch below;
--    actual migration goes in 003_forms_table.sql when we're ready.
-- ──────────────────────────────────────────────────────────────────────
-- create table if not exists forms (
--   id           uuid primary key default gen_random_uuid(),
--   officer_id   uuid not null references auth.users(id) on delete cascade,
--   slug         text unique not null,
--   bank         text not null,
--   form_type    text not null,
--   customer     text,
--   status       text not null default 'pending',
--   created_at   timestamptz default now(),
--   expires_at   timestamptz
-- );
--
-- alter table forms enable row level security;
--
-- create policy "officer_select_own"  on forms for select to authenticated
--   using (officer_id = auth.uid());
-- create policy "officer_insert_own"  on forms for insert to authenticated
--   with check (officer_id = auth.uid());
-- create policy "officer_update_own"  on forms for update to authenticated
--   using (officer_id = auth.uid());
-- create policy "officer_delete_own"  on forms for delete to authenticated
--   using (officer_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- 5. Default-deny safety net — list tables that should NEVER be readable
--    by anon. Apply RLS without policies = nothing readable = safe default.
-- ──────────────────────────────────────────────────────────────────────
do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('form_access_codes')
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end$$;

-- ──────────────────────────────────────────────────────────────────────
-- 6. Final audit — re-run section 1 to confirm rowsecurity = true everywhere
-- ──────────────────────────────────────────────────────────────────────
