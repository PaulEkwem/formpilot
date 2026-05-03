-- Sprint X — Mark form complete from the anonymous customer/referee side
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Problem: when a customer/referee finishes filling a form and downloads
-- the PDF, the dashboard's `forms.status` stays 'pending' forever because
-- RLS on the `forms` table only allows the OFFICER to UPDATE their rows,
-- and the customer is anonymous (anon role, no auth).
--
-- Fix: a SECURITY DEFINER function that anon can call with a slug to
-- atomically (a) flip status to 'complete' and (b) consume the access
-- code. Only marks complete if the access code still exists — so a
-- second call (e.g. accidental refresh after completion) is a no-op
-- and won't toggle a re-opened form back to complete.

create or replace function mark_form_complete(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  had_code boolean;
begin
  -- Was there an unused access code for this slug? (proof the form was
  -- generated and not yet completed)
  select exists(
    select 1 from form_access_codes where session_id = p_slug
  ) into had_code;

  if not had_code then
    return false;
  end if;

  -- Flip status only if currently pending — don't clobber expired/cancelled
  update forms
     set status       = 'complete',
         completed_at = now()
   where slug = p_slug
     and status = 'pending';

  -- Consume the access code (one-time use)
  delete from form_access_codes
   where session_id = p_slug;

  return true;
end;
$$;

revoke all on function mark_form_complete(text) from public;
grant execute on function mark_form_complete(text) to anon, authenticated;
