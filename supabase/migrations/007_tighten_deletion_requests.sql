-- Sprint X — Tighten deletion_requests INSERT policy
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Background: NDPA §38 erasure right requires anyone — including
-- non-customers — to be able to submit a deletion request. Locking
-- INSERT to authenticated users would break legal compliance.
--
-- The previous policy (`with check (true)`) was too permissive. This
-- migration keeps anon INSERT but adds field-level validation.
--
-- What this fixes:
--   1. STATUS SPOOFING — anon could previously insert
--      `status = 'completed', resolved_at = now()` so the request
--      appeared already-handled and bypassed the admin review queue.
--      Now: status must be 'pending' on insert.
--   2. RESOLUTION FORGERY — `resolved_by` is an FK to auth.users; anon
--      could plant a random UUID to impersonate an officer in the
--      audit trail. Now: must be NULL on insert.
--   3. EMAIL GARBAGE — any string previously passed. Now: must look
--      like an email (RFC-loose regex).
--   4. STORAGE EXHAUSTION — `reason` is unlimited text. An attacker
--      could submit megabyte blobs. Now: capped at 2000 chars.
--   5. EMPTY EMAIL — column is NOT NULL but '' previously passed.
--      Now: at least 5 chars (a@b.c).
--
-- What this does NOT fix (out of scope):
--   - High-volume spam — needs rate limiting at the send-email Edge
--     Function or an hCaptcha on the deletion-request form.
--   - Deceptive identity — Alice submitting Bob's email. RLS cannot
--     verify ownership; that requires an email-confirmation round-trip
--     before the row is enqueued.

drop policy if exists "anon_insert_deletion_request"  on deletion_requests;
drop policy if exists "auth_insert_deletion_request"  on deletion_requests;

-- Anon path (general public exercising NDPA §38 erasure right)
create policy "anon_insert_deletion_request" on deletion_requests
  for insert to anon
  with check (
    email   is not null
    and length(email)  between 5 and 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and status = 'pending'
    and resolved_at is null
    and resolved_by is null
    and (reason is null or length(reason) <= 2000)
  );

-- Authenticated path (logged-in officer submitting on behalf of a
-- customer who phoned in). Same constraints — auth doesn't grant the
-- right to forge status/resolver fields.
create policy "auth_insert_deletion_request" on deletion_requests
  for insert to authenticated
  with check (
    email   is not null
    and length(email)  between 5 and 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and status = 'pending'
    and resolved_at is null
    and resolved_by is null
    and (reason is null or length(reason) <= 2000)
  );

-- Verification:
-- Should succeed:
--   insert into deletion_requests (email) values ('alice@example.com');
-- Should fail (status forgery):
--   insert into deletion_requests (email, status) values ('a@b.com','completed');
-- Should fail (bad email):
--   insert into deletion_requests (email) values ('not-an-email');
