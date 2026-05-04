-- Sprint X — Admin dashboard backend
-- Run this in Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Provides controlled, audited admin access to all platform data
-- without granting service-role privileges to the browser.
--
-- Architecture:
--   1. `admins` table — whitelist of user_ids granted admin access.
--   2. `is_admin()` — fast boolean check used by admin RPCs.
--   3. SECURITY DEFINER RPC functions — bypass RLS to read across all
--      officers, but each function gates with `is_admin()` check.
--   4. Admin actions are themselves recorded via log_audit().

-- ──────────────────────────────────────────────────────────────────────
-- 1. admins whitelist
-- ──────────────────────────────────────────────────────────────────────
create table if not exists admins (
  user_id   uuid        primary key references auth.users(id) on delete cascade,
  added_at  timestamptz not null default now(),
  added_by  uuid        references auth.users(id),
  notes     text
);

alter table admins enable row level security;

-- Only existing admins can view the admin list
drop policy if exists "admin_select_admins" on admins;
create policy "admin_select_admins" on admins
  for select to authenticated
  using (exists (select 1 from admins a where a.user_id = auth.uid()));

-- Bootstrap: grant Paul admin on first run
insert into admins (user_id, notes)
  select id, 'Bootstrap admin (founder)'
  from   auth.users
  where  email = 'ekwempaul0@gmail.com'
on conflict (user_id) do nothing;

-- ──────────────────────────────────────────────────────────────────────
-- 2. is_admin() — single source of truth for admin gate
-- ──────────────────────────────────────────────────────────────────────
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from admins where user_id = auth.uid());
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 3. admin_stats() — overview counts for dashboard tiles
-- ──────────────────────────────────────────────────────────────────────
create or replace function admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  return json_build_object(
    'officers_total',         (select count(*) from auth.users),
    'officers_new_7d',        (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'forms_total',            (select count(*) from forms),
    'forms_pending',          (select count(*) from forms where status = 'pending'),
    'forms_complete',         (select count(*) from forms where status = 'complete'),
    'forms_expired',          (select count(*) from forms where status = 'expired'),
    'forms_today',            (select count(*) from forms where created_at::date = current_date),
    'completion_rate',        (select case when count(*) = 0 then 0
                                            else round(100.0 * count(*) filter (where status='complete') / count(*), 1)
                                       end
                               from forms),
    'deletions_pending',      (select count(*) from deletion_requests where status = 'pending'),
    'audit_today',            (select count(*) from audit_log where created_at::date = current_date)
  );
end;
$$;

revoke all on function admin_stats() from public;
grant execute on function admin_stats() to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 4. admin_list_officers() — every officer with form counts
-- ──────────────────────────────────────────────────────────────────────
create or replace function admin_list_officers(p_limit int default 100, p_offset int default 0)
returns table(
  user_id           uuid,
  email             text,
  name              text,
  bank              text,
  role              text,
  phone             text,
  marketing_consent boolean,
  created_at        timestamptz,
  last_sign_in_at   timestamptz,
  total_forms       bigint,
  completed_forms   bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  return query
    select
      u.id,
      u.email::text,
      coalesce(u.raw_user_meta_data->>'name','')::text,
      coalesce(u.raw_user_meta_data->>'bank','')::text,
      coalesce(u.raw_user_meta_data->>'role','')::text,
      coalesce(u.raw_user_meta_data->>'phone','')::text,
      coalesce((u.raw_user_meta_data->>'marketing_consent')::boolean, false),
      u.created_at,
      u.last_sign_in_at,
      coalesce((select count(*) from forms f where f.officer_id = u.id), 0)::bigint,
      coalesce((select count(*) from forms f where f.officer_id = u.id and f.status = 'complete'), 0)::bigint
    from auth.users u
    order by u.created_at desc
    limit p_limit offset p_offset;
end;
$$;

revoke all on function admin_list_officers(int, int) from public;
grant execute on function admin_list_officers(int, int) to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 5. admin_list_forms() — all forms across officers
-- ──────────────────────────────────────────────────────────────────────
create or replace function admin_list_forms(
  p_status text default null,
  p_limit  int  default 200,
  p_offset int  default 0
)
returns table(
  id            uuid,
  slug          text,
  bank          text,
  form_type     text,
  customer_name text,
  status        text,
  officer_email text,
  officer_name  text,
  created_at    timestamptz,
  expires_at    timestamptz,
  completed_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  return query
    select
      f.id,
      f.slug,
      f.bank,
      f.form_type,
      f.customer_name,
      f.status,
      u.email::text,
      coalesce(u.raw_user_meta_data->>'name','')::text,
      f.created_at,
      f.expires_at,
      f.completed_at
    from forms f
    left join auth.users u on u.id = f.officer_id
    where p_status is null or f.status = p_status
    order by f.created_at desc
    limit p_limit offset p_offset;
end;
$$;

revoke all on function admin_list_forms(text, int, int) from public;
grant execute on function admin_list_forms(text, int, int) to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 6. admin_list_audit() — full audit log with officer email
-- ──────────────────────────────────────────────────────────────────────
create or replace function admin_list_audit(
  p_limit  int default 200,
  p_offset int default 0
)
returns table(
  id            uuid,
  action        text,
  resource_type text,
  resource_id   text,
  metadata      jsonb,
  officer_email text,
  created_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  return query
    select
      a.id,
      a.action,
      a.resource_type,
      a.resource_id,
      a.metadata,
      u.email::text,
      a.created_at
    from audit_log a
    left join auth.users u on u.id = a.officer_id
    order by a.created_at desc
    limit p_limit offset p_offset;
end;
$$;

revoke all on function admin_list_audit(int, int) from public;
grant execute on function admin_list_audit(int, int) to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 7. admin_list_deletions() — deletion-request queue
-- ──────────────────────────────────────────────────────────────────────
create or replace function admin_list_deletions(
  p_status text default null,
  p_limit  int  default 100,
  p_offset int  default 0
)
returns setof deletion_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  return query
    select * from deletion_requests
    where p_status is null or status = p_status
    order by requested_at desc
    limit p_limit offset p_offset;
end;
$$;

revoke all on function admin_list_deletions(text, int, int) from public;
grant execute on function admin_list_deletions(text, int, int) to authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 8. admin_resolve_deletion() — mark a deletion request handled
-- ──────────────────────────────────────────────────────────────────────
create or replace function admin_resolve_deletion(
  p_id     uuid,
  p_status text,
  p_notes  text default null
)
returns deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result deletion_requests;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;

  if p_status not in ('in_progress','completed','rejected') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update deletion_requests
     set status      = p_status,
         resolved_at = case when p_status in ('completed','rejected') then now() else resolved_at end,
         resolved_by = auth.uid(),
         notes       = coalesce(p_notes, notes)
   where id = p_id
   returning * into result;

  if result.id is null then
    raise exception 'Deletion request not found';
  end if;

  -- Audit the admin action
  perform log_audit('admin.deletion.resolved', 'deletion_request', p_id::text,
    json_build_object('new_status', p_status, 'notes', p_notes)::jsonb);

  return result;
end;
$$;

revoke all on function admin_resolve_deletion(uuid, text, text) from public;
grant execute on function admin_resolve_deletion(uuid, text, text) to authenticated;
