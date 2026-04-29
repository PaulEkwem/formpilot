-- Sprint 7 — Audit log + deletion requests
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Goals:
--   1. NDPR/NDPA accountability: every officer action recorded with
--      timestamp + actor + resource + metadata. Tamper-resistant via
--      append-only constraint + officer-can-only-read-own RLS.
--   2. Data Subject Rights: deletion_requests queue for handling
--      erasure requests within 30 days (NDPA §38).

-- ──────────────────────────────────────────────────────────────────────
-- 1. audit_log table
-- ──────────────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id            uuid        primary key default gen_random_uuid(),
  officer_id    uuid        references auth.users(id) on delete set null,
  action        text        not null,
  resource_type text,
  resource_id   text,
  metadata      jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_officer_created_idx
  on audit_log(officer_id, created_at desc);
create index if not exists audit_action_idx
  on audit_log(action, created_at desc);

alter table audit_log enable row level security;

-- Officers can SELECT their own audit entries (transparency to data subject)
drop policy if exists "officer_select_own_audit" on audit_log;
create policy "officer_select_own_audit" on audit_log
  for select to authenticated
  using (officer_id = auth.uid());

-- No direct INSERT — must go through log_audit() function below.
-- No UPDATE/DELETE — append-only by RLS absence.

-- ──────────────────────────────────────────────────────────────────────
-- 2. log_audit() — SECURITY DEFINER inserter
--    Auto-injects officer_id from auth.uid(). Caller cannot spoof.
-- ──────────────────────────────────────────────────────────────────────
create or replace function log_audit(
  p_action        text,
  p_resource_type text default null,
  p_resource_id   text default null,
  p_metadata      jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  -- Refuse anonymous calls — auth.uid() is null for anon role
  if auth.uid() is null then
    raise exception 'log_audit requires authenticated user';
  end if;

  insert into audit_log (officer_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata)
  returning id into new_id;

  return new_id;
end;
$$;

-- Allow authenticated users to call the function. RLS on the table
-- still applies to SELECTs they make later.
revoke all on function log_audit(text, text, text, jsonb) from public;
grant execute on function log_audit(text, text, text, jsonb) to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 3. deletion_requests — NDPA §38 erasure right queue
-- ──────────────────────────────────────────────────────────────────────
create table if not exists deletion_requests (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null,
  reason       text,
  requested_at timestamptz not null default now(),
  status       text        not null default 'pending'
                            check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  resolved_at  timestamptz,
  resolved_by  uuid        references auth.users(id),
  notes        text
);

create index if not exists deletion_requests_status_idx
  on deletion_requests(status, requested_at);
create index if not exists deletion_requests_email_idx
  on deletion_requests(email);

alter table deletion_requests enable row level security;

-- Anyone (anon) can submit a deletion request — they may not have an
-- account anymore, or never had one (a customer who got a form link).
drop policy if exists "anon_insert_deletion_request" on deletion_requests;
create policy "anon_insert_deletion_request" on deletion_requests
  for insert to anon
  with check (true);

drop policy if exists "auth_insert_deletion_request" on deletion_requests;
create policy "auth_insert_deletion_request" on deletion_requests
  for insert to authenticated
  with check (true);

-- No SELECT/UPDATE/DELETE for anon or authenticated.
-- Admin/support handles via Supabase Studio or future admin UI.
-- (Service role key bypasses RLS for admin operations.)

-- ──────────────────────────────────────────────────────────────────────
-- 4. Verification queries (uncomment to run)
-- ──────────────────────────────────────────────────────────────────────
-- SELECT * FROM pg_policies WHERE tablename IN ('audit_log','deletion_requests');
-- SELECT log_audit('test.event', 'test', 'abc', '{"foo":"bar"}'::jsonb);
-- SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;
