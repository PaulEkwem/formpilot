-- Run this in the Supabase SQL editor:
-- Dashboard → SQL Editor → New Query → paste and run
-- (Safe to re-run — all statements are idempotent)

-- 1. Create the access codes table
create table if not exists form_access_codes (
  session_id      text        primary key,
  access_code     text        not null,
  expires_at      bigint      not null,
  failed_attempts int         not null default 0,
  locked_until    bigint      not null default 0,
  created_at      timestamptz          default now()
);

-- 2. Enable Row Level Security
alter table form_access_codes enable row level security;

-- 3. Allow the dashboard (anon) to INSERT codes — no SELECT ever
drop policy if exists "insert_codes" on form_access_codes;
create policy "insert_codes" on form_access_codes
  for insert to anon with check (true);

-- 4. Verification function with server-side brute-force lockout.
--    SECURITY DEFINER lets it read/write the table despite anon having no SELECT.
--    Logic:
--      - Returns false immediately if session not found, expired, or locked.
--      - On correct code → resets failed_attempts, returns true.
--      - On wrong code  → increments failed_attempts; if >= 5, locks for 15 minutes.
--    A script calling this 1M times still hits the lockout after 5 attempts.
create or replace function verify_form_code(p_session_id text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec form_access_codes%rowtype;
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select * into rec
  from   form_access_codes
  where  session_id = p_session_id;

  -- Unknown session
  if not found then return false; end if;

  -- Link expired
  if rec.expires_at < now_ms then return false; end if;

  -- Account locked (too many wrong guesses)
  if rec.locked_until > now_ms then return false; end if;

  -- Correct code
  if rec.access_code = p_code then
    update form_access_codes
    set    failed_attempts = 0,
           locked_until    = 0
    where  session_id = p_session_id;
    return true;
  end if;

  -- Wrong code — increment counter, lock after 5 failures for 15 minutes
  update form_access_codes
  set    failed_attempts = failed_attempts + 1,
         locked_until    = case
           when failed_attempts + 1 >= 5
           then now_ms + 900000   -- 15 minutes in ms
           else locked_until
         end
  where  session_id = p_session_id;

  return false;
end;
$$;
