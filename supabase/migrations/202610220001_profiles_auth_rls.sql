create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  employee_code text,
  role text not null default 'employee'
    check (role in ('hr_admin', 'employee')),
  office text,
  department text,
  position text,
  start_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email));

create unique index if not exists profiles_employee_code_unique
  on public.profiles (employee_code)
  where employee_code is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_user_is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'hr_admin'
      and p.is_active
  );
$$;

revoke all on function public.current_user_is_hr_admin() from public;
grant execute on function public.current_user_is_hr_admin() to authenticated;

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists profiles_select_self_or_hr_admin
  on public.profiles;
create policy profiles_select_self_or_hr_admin
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_is_hr_admin()
  );
