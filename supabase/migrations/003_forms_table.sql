-- Sprint 3 — Forms table (officer pipeline view)
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Goal: replace localStorage as the source-of-truth for an officer's
-- form list. Officer sees their forms across devices; survives cache
-- clears; foundation for analytics, audit log, multi-officer features.
--
-- Distinction from form_access_codes (migration 001):
--   form_access_codes = customer/referee-facing access tokens (anon writes,
--                       brute-force lockout, never readable by officer)
--   forms             = officer's view of their pipeline (officer-only RLS,
--                       no customer access)
-- Both tables are populated when the officer generates a link.

-- ──────────────────────────────────────────────────────────────────────
-- 1. Table
-- ──────────────────────────────────────────────────────────────────────
create table if not exists forms (
  id              uuid        primary key default gen_random_uuid(),
  officer_id      uuid        not null default auth.uid()
                              references auth.users(id) on delete cascade,
  slug            text        unique not null,
  bank            text        not null,
  form_type       text        not null,
  customer_name   text        not null,
  customer_email  text,
  customer_phone  text,
  director_name   text,        -- Reference Form (corporate) only
  ref_type        text,        -- Reference Form: 'individual' | 'corporate'
  status          text        not null default 'pending'
                              check (status in ('pending','complete','expired','cancelled')),
  note            text,
  config          jsonb,        -- form-specific extras (free-form)
  link            text,         -- denormalized link for instant copy
  access_code     text,         -- 6-digit code (NOT the actual hash)
  created_at      timestamptz  not null default now(),
  expires_at      timestamptz,
  completed_at    timestamptz
);

-- ──────────────────────────────────────────────────────────────────────
-- 2. Indexes — officer dashboard queries are by officer_id, sorted by date
-- ──────────────────────────────────────────────────────────────────────
create index if not exists forms_officer_created_idx
  on forms(officer_id, created_at desc);
create index if not exists forms_slug_idx
  on forms(slug);

-- ──────────────────────────────────────────────────────────────────────
-- 3. RLS — officer can only see/touch their own rows. Default-deny
--    (no policy = no access) was applied by migration 002.
-- ──────────────────────────────────────────────────────────────────────
alter table forms enable row level security;

drop policy if exists "officer_select_own" on forms;
create policy "officer_select_own" on forms
  for select to authenticated
  using (officer_id = auth.uid());

drop policy if exists "officer_insert_own" on forms;
create policy "officer_insert_own" on forms
  for insert to authenticated
  with check (officer_id = auth.uid());

drop policy if exists "officer_update_own" on forms;
create policy "officer_update_own" on forms
  for update to authenticated
  using (officer_id = auth.uid())
  with check (officer_id = auth.uid());

drop policy if exists "officer_delete_own" on forms;
create policy "officer_delete_own" on forms
  for delete to authenticated
  using (officer_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- 4. Updated_at trigger — keep `updated_at` honest (added in next sprint)
--    For now, we rely on application-level updates to `status` and
--    `completed_at`. Skipping the trigger keeps this migration small.
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- 5. Verification — copy/paste these queries to spot-check after migrate
-- ──────────────────────────────────────────────────────────────────────
-- SELECT pg_get_tabledef('forms'::regclass);  -- (Postgres 15+ helper)
-- SELECT * FROM pg_policies WHERE tablename = 'forms';
-- SELECT count(*) FROM forms;  -- should be 0 right after migration
