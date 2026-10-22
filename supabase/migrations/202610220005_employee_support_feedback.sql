create table public.support_contacts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  support_role text not null check (length(trim(support_role)) between 1 and 120),
  scope_type text not null default 'company' check (
    scope_type in ('company', 'office', 'department', 'position', 'group', 'employee')
  ),
  scope_value text,
  contact_email text,
  contact_phone text,
  contact_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_type = 'company' and scope_value is null)
    or (scope_type <> 'company' and nullif(trim(scope_value), '') is not null)
  ),
  check (
    contact_email is not null or contact_phone is not null or contact_url is not null
  )
);

create index support_contacts_scope_active_idx
  on public.support_contacts (is_active, scope_type, scope_value);
create trigger support_contacts_set_updated_at
before update on public.support_contacts
for each row execute function public.set_updated_at();

alter table public.support_contacts enable row level security;
revoke all on table public.support_contacts from anon, authenticated;
grant select on table public.support_contacts to authenticated;
create policy support_contacts_select_scope
  on public.support_contacts for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or (
      is_active
      and public.current_user_matches_scope(scope_type, scope_value)
    )
  );

create table public.ux_feedback (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete restrict,
  category text not null check (
    category in ('roadmap', 'content', 'navigation', 'accessibility', 'other')
  ),
  message text not null check (length(trim(message)) between 1 and 2000),
  page_path text not null default '/profile'
    check (length(page_path) <= 120 and left(page_path, 1) = '/'),
  submitted_at timestamptz not null default now()
);

create index ux_feedback_employee_submitted_idx
  on public.ux_feedback (employee_id, submitted_at desc);
alter table public.ux_feedback enable row level security;
revoke all on table public.ux_feedback from anon, authenticated;
grant select on table public.ux_feedback to authenticated;
create policy ux_feedback_select_owner_or_hr
  on public.ux_feedback for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or employee_id = auth.uid()
  );

create or replace function public.submit_ux_feedback(
  p_category text,
  p_message text,
  p_page_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feedback_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'employee' and is_active
  ) then
    raise exception 'Active employee account required' using errcode = '42501';
  end if;
  if p_category not in ('roadmap', 'content', 'navigation', 'accessibility', 'other')
     or nullif(trim(p_message), '') is null
     or length(p_message) > 2000
     or p_page_path is null
     or length(p_page_path) > 120
     or left(p_page_path, 1) <> '/' then
    raise exception 'Invalid feedback payload' using errcode = '22023';
  end if;

  insert into public.ux_feedback (employee_id, category, message, page_path)
  values (auth.uid(), p_category, trim(p_message), p_page_path)
  returning id into v_feedback_id;
  return v_feedback_id;
end;
$$;

revoke all on function public.submit_ux_feedback(text, text, text) from public;
grant execute on function public.submit_ux_feedback(text, text, text) to authenticated;
