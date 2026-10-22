alter table public.profiles
  add column if not exists audience_group text;

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  category text not null default 'general',
  content_type text not null check (
    content_type in ('text', 'image', 'video', 'file_link', 'task', 'quiz_form')
  ),
  scope_type text not null default 'company' check (
    scope_type in ('company', 'office', 'department', 'position', 'group', 'employee')
  ),
  scope_value text,
  status text not null default 'draft' check (
    status in ('draft', 'published', 'archived')
  ),
  owner_id uuid not null references public.profiles (id),
  current_version integer not null default 0 check (current_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_type = 'company' and scope_value is null)
    or (scope_type <> 'company' and nullif(trim(scope_value), '') is not null)
  )
);

create index contents_status_type_idx on public.contents (status, content_type);
create index contents_scope_idx on public.contents (scope_type, scope_value);
create trigger contents_set_updated_at
before update on public.contents
for each row execute function public.set_updated_at();

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete restrict,
  version_number integer not null check (version_number > 0),
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  change_note text not null default '',
  version_status text not null default 'draft'
    check (version_status in ('draft', 'published')),
  created_by uuid not null references public.profiles (id),
  published_by uuid references public.profiles (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (content_id, version_number),
  check (
    (version_status = 'draft' and published_at is null and published_by is null)
    or (version_status = 'published' and published_at is not null and published_by is not null)
  )
);

create index content_versions_content_idx
  on public.content_versions (content_id, version_number desc);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 160),
  description text not null default '',
  scope_type text not null default 'company' check (
    scope_type in ('company', 'office', 'department', 'position', 'group', 'employee')
  ),
  scope_value text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  version_number integer not null default 0 check (version_number >= 0),
  created_by uuid not null references public.profiles (id),
  published_by uuid references public.profiles (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_type = 'company' and scope_value is null)
    or (scope_type <> 'company' and nullif(trim(scope_value), '') is not null)
  )
);

create index templates_status_scope_idx
  on public.templates (status, scope_type, scope_value);
create trigger templates_set_updated_at
before update on public.templates
for each row execute function public.set_updated_at();

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  sequence integer not null check (sequence >= 0),
  available_offset_days integer not null default 0
    check (available_offset_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_id, sequence)
);

create index milestones_template_order_idx
  on public.milestones (template_id, sequence);

create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  content_id uuid not null references public.contents (id) on delete restrict,
  sequence integer not null check (sequence >= 0),
  is_required boolean not null default true,
  available_offset_days integer not null default 0
    check (available_offset_days >= 0),
  due_offset_days integer
    check (due_offset_days is null or due_offset_days >= 0),
  completion_rule text not null check (
    completion_rule in (
      'manual_self_confirmation',
      'form_submission',
      'quiz_participation',
      'quiz_pass_required',
      'content_acknowledgement',
      'admin_completion'
    )
  ),
  include_in_progress boolean not null default true,
  responsible_role text,
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (milestone_id, sequence)
);

create index template_items_milestone_order_idx
  on public.template_items (milestone_id, sequence);
create index template_items_content_idx on public.template_items (content_id);
create trigger template_items_set_updated_at
before update on public.template_items
for each row execute function public.set_updated_at();

create or replace function public.current_user_matches_scope(
  p_scope_type text,
  p_scope_value text
)
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
      and p.is_active
      and case p_scope_type
        when 'company' then true
        when 'office' then p.office = p_scope_value
        when 'department' then p.department = p_scope_value
        when 'position' then p.position = p_scope_value
        when 'group' then p.audience_group = p_scope_value
        when 'employee' then p.id::text = p_scope_value
        else false
      end
  );
$$;

revoke all on function public.current_user_matches_scope(text, text) from public;
grant execute on function public.current_user_matches_scope(text, text)
  to authenticated;

alter table public.contents enable row level security;
alter table public.content_versions enable row level security;
alter table public.templates enable row level security;
alter table public.milestones enable row level security;
alter table public.template_items enable row level security;

revoke all on table
  public.contents,
  public.content_versions,
  public.templates,
  public.milestones,
  public.template_items
from anon, authenticated;
grant select on table
  public.contents,
  public.content_versions,
  public.templates,
  public.milestones,
  public.template_items
to authenticated;

create policy contents_select_scope
  on public.contents for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or (
      status = 'published'
      and public.current_user_matches_scope(scope_type, scope_value)
    )
  );

create policy content_versions_select_scope
  on public.content_versions for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or (
      version_status = 'published'
      and exists (
        select 1 from public.contents c
        where c.id = content_versions.content_id
          and c.status = 'published'
          and c.current_version = content_versions.version_number
          and public.current_user_matches_scope(c.scope_type, c.scope_value)
      )
    )
  );

create policy templates_select_scope
  on public.templates for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or (
      status = 'published'
      and public.current_user_matches_scope(scope_type, scope_value)
    )
  );

create policy milestones_select_scope
  on public.milestones for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or exists (
      select 1 from public.templates t
      where t.id = milestones.template_id
        and t.status = 'published'
        and public.current_user_matches_scope(t.scope_type, t.scope_value)
    )
  );

create policy template_items_select_scope
  on public.template_items for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or exists (
      select 1
      from public.milestones m
      join public.templates t on t.id = m.template_id
      join public.contents c on c.id = template_items.content_id
      where m.id = template_items.milestone_id
        and m.is_active
        and template_items.is_active
        and t.status = 'published'
        and c.status = 'published'
        and public.current_user_matches_scope(t.scope_type, t.scope_value)
        and public.current_user_matches_scope(c.scope_type, c.scope_value)
    )
  );

create or replace function public.create_content_draft(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content_id uuid;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload -> 'body') <> 'object' then
    raise exception 'Invalid content payload' using errcode = '22023';
  end if;

  insert into public.contents (
    slug, title, description, category, content_type,
    scope_type, scope_value, owner_id
  )
  values (
    p_payload ->> 'slug',
    p_payload ->> 'title',
    coalesce(p_payload ->> 'description', ''),
    coalesce(p_payload ->> 'category', 'general'),
    p_payload ->> 'content_type',
    coalesce(p_payload ->> 'scope_type', 'company'),
    p_payload ->> 'scope_value',
    auth.uid()
  )
  returning id into v_content_id;

  insert into public.content_versions (
    content_id, version_number, body, version_status, created_by
  )
  values (
    v_content_id, 1, p_payload -> 'body', 'draft', auth.uid()
  );

  update public.contents set current_version = 1 where id = v_content_id;
  return v_content_id;
end;
$$;

create or replace function public.publish_content(
  p_content_id uuid,
  p_payload jsonb,
  p_change_note text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content public.contents%rowtype;
  v_version integer;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if nullif(trim(p_change_note), '') is null
     or length(p_change_note) > 1000
     or jsonb_typeof(p_payload -> 'body') <> 'object' then
    raise exception 'A change note and valid content body are required'
      using errcode = '22023';
  end if;

  select * into v_content
  from public.contents
  where id = p_content_id
  for update;
  if not found or v_content.status = 'archived' then
    raise exception 'Content is unavailable' using errcode = 'P0002';
  end if;

  update public.contents set
    title = p_payload ->> 'title',
    description = coalesce(p_payload ->> 'description', ''),
    category = coalesce(p_payload ->> 'category', 'general'),
    content_type = p_payload ->> 'content_type',
    scope_type = coalesce(p_payload ->> 'scope_type', 'company'),
    scope_value = p_payload ->> 'scope_value'
  where id = p_content_id;

  if v_content.status = 'draft' then
    v_version := greatest(v_content.current_version, 1);
    update public.content_versions set
      body = p_payload -> 'body',
      change_note = p_change_note,
      version_status = 'published',
      published_by = auth.uid(),
      published_at = now()
    where content_id = p_content_id
      and version_number = v_version
      and version_status = 'draft';

    if not found then
      insert into public.content_versions (
        content_id, version_number, body, change_note,
        version_status, created_by, published_by, published_at
      )
      values (
        p_content_id, v_version, p_payload -> 'body', p_change_note,
        'published', auth.uid(), auth.uid(), now()
      );
    end if;
  else
    v_version := v_content.current_version + 1;
    insert into public.content_versions (
      content_id, version_number, body, change_note,
      version_status, created_by, published_by, published_at
    )
    values (
      p_content_id, v_version, p_payload -> 'body', p_change_note,
      'published', auth.uid(), auth.uid(), now()
    );
  end if;

  update public.contents set
    current_version = v_version,
    status = 'published'
  where id = p_content_id;

  return v_version;
end;
$$;

create or replace function public.archive_content(p_content_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.contents set status = 'archived' where id = p_content_id;
  if not found then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.create_template_draft(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template_id uuid;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid template payload' using errcode = '22023';
  end if;

  insert into public.templates (
    slug, name, description, scope_type, scope_value, created_by
  )
  values (
    p_payload ->> 'slug',
    p_payload ->> 'name',
    coalesce(p_payload ->> 'description', ''),
    coalesce(p_payload ->> 'scope_type', 'company'),
    p_payload ->> 'scope_value',
    auth.uid()
  )
  returning id into v_template_id;

  return v_template_id;
end;
$$;

create or replace function public.update_template_draft(
  p_template_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.templates set
    name = p_payload ->> 'name',
    description = coalesce(p_payload ->> 'description', ''),
    scope_type = coalesce(p_payload ->> 'scope_type', 'company'),
    scope_value = p_payload ->> 'scope_value'
  where id = p_template_id and status = 'draft';
  if not found then
    raise exception 'Draft template not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.add_template_milestone(
  p_template_id uuid,
  p_name text,
  p_sequence integer,
  p_available_offset_days integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_milestone_id uuid;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.templates
    where id = p_template_id and status = 'draft'
  ) then
    raise exception 'Only draft templates can be changed'
      using errcode = '55000';
  end if;

  insert into public.milestones (
    template_id, name, sequence, available_offset_days
  )
  values (
    p_template_id, p_name, p_sequence, p_available_offset_days
  )
  returning id into v_milestone_id;
  return v_milestone_id;
end;
$$;

create or replace function public.add_template_item(
  p_milestone_id uuid,
  p_content_id uuid,
  p_sequence integer,
  p_is_required boolean,
  p_available_offset_days integer,
  p_due_offset_days integer,
  p_completion_rule text,
  p_include_in_progress boolean,
  p_settings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.templates%rowtype;
  v_content public.contents%rowtype;
  v_item_id uuid;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;

  select t.* into v_template
  from public.templates t
  join public.milestones m on m.template_id = t.id
  where m.id = p_milestone_id and m.is_active and t.status = 'draft';
  if not found then
    raise exception 'Milestone does not belong to a draft template'
      using errcode = '55000';
  end if;

  select * into v_content
  from public.contents
  where id = p_content_id and status = 'published';
  if not found then
    raise exception 'Template items must reference published content'
      using errcode = '22023';
  end if;

  if v_content.scope_type <> 'company'
     and (
       v_template.scope_type = 'company'
       or v_content.scope_type <> v_template.scope_type
       or v_content.scope_value <> v_template.scope_value
     ) then
    raise exception 'Template and content audiences are incompatible'
      using errcode = '22023';
  end if;

  insert into public.template_items (
    milestone_id, content_id, sequence, is_required,
    available_offset_days, due_offset_days, completion_rule,
    include_in_progress, settings
  )
  values (
    p_milestone_id, p_content_id, p_sequence, p_is_required,
    p_available_offset_days, p_due_offset_days, p_completion_rule,
    p_include_in_progress, coalesce(p_settings, '{}'::jsonb)
  )
  returning id into v_item_id;
  return v_item_id;
end;
$$;

create or replace function public.publish_template(p_template_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.templates where id = p_template_id and status = 'draft'
  ) then
    raise exception 'Draft template not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.milestones m
    join public.template_items i on i.milestone_id = m.id
    join public.contents c on c.id = i.content_id
    where m.template_id = p_template_id
      and m.is_active
      and i.is_active
      and c.status = 'published'
  ) then
    raise exception 'A published template needs at least one usable activity'
      using errcode = '22023';
  end if;

  update public.templates set
    status = 'published',
    version_number = version_number + 1,
    published_by = auth.uid(),
    published_at = now()
  where id = p_template_id
  returning version_number into v_version;
  return v_version;
end;
$$;

create or replace function public.reopen_template_draft(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.templates set status = 'draft' where id = p_template_id
    and status = 'published';
  if not found then
    raise exception 'Published template not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.update_template_milestone(
  p_milestone_id uuid,
  p_name text,
  p_available_offset_days integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.milestones m set
    name = p_name,
    available_offset_days = p_available_offset_days
  from public.templates t
  where m.id = p_milestone_id
    and t.id = m.template_id
    and t.status = 'draft'
    and m.is_active;
  if not found then
    raise exception 'Active milestone in a draft template not found'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.move_template_milestone(
  p_milestone_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template_id uuid;
  v_sequence integer;
  v_neighbor_id uuid;
  v_neighbor_sequence integer;
  v_temporary_sequence integer;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down' using errcode = '22023';
  end if;
  select m.template_id, m.sequence into v_template_id, v_sequence
  from public.milestones m
  join public.templates t on t.id = m.template_id
  where m.id = p_milestone_id and m.is_active and t.status = 'draft';
  if not found then
    raise exception 'Active milestone in a draft template not found'
      using errcode = 'P0002';
  end if;

  select m.id, m.sequence into v_neighbor_id, v_neighbor_sequence
  from public.milestones m
  where m.template_id = v_template_id
    and m.is_active
    and (
      (p_direction = 'up' and m.sequence < v_sequence)
      or (p_direction = 'down' and m.sequence > v_sequence)
    )
  order by
    case when p_direction = 'up' then m.sequence end desc,
    case when p_direction = 'down' then m.sequence end asc
  limit 1;
  if not found then
    return;
  end if;

  select coalesce(max(sequence), 0) + 1 into v_temporary_sequence
  from public.milestones where template_id = v_template_id;
  update public.milestones set sequence = v_temporary_sequence
    where id = p_milestone_id;
  update public.milestones set sequence = v_sequence
    where id = v_neighbor_id;
  update public.milestones set sequence = v_neighbor_sequence
    where id = p_milestone_id;
end;
$$;

create or replace function public.remove_template_milestone(p_milestone_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.milestones m set is_active = false
  from public.templates t
  where m.id = p_milestone_id
    and m.template_id = t.id
    and m.is_active
    and t.status = 'draft';
  if not found then
    raise exception 'Active milestone in a draft template not found'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.update_template_item(
  p_item_id uuid,
  p_is_required boolean,
  p_available_offset_days integer,
  p_due_offset_days integer,
  p_completion_rule text,
  p_include_in_progress boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.template_items i set
    is_required = p_is_required,
    available_offset_days = p_available_offset_days,
    due_offset_days = p_due_offset_days,
    completion_rule = p_completion_rule,
    include_in_progress = p_include_in_progress
  from public.milestones m
  join public.templates t on t.id = m.template_id
  where i.id = p_item_id
    and i.milestone_id = m.id
    and i.is_active
    and m.is_active
    and t.status = 'draft';
  if not found then
    raise exception 'Active item in a draft template not found'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.move_template_item(
  p_item_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_milestone_id uuid;
  v_sequence integer;
  v_neighbor_id uuid;
  v_neighbor_sequence integer;
  v_temporary_sequence integer;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down' using errcode = '22023';
  end if;
  select i.milestone_id, i.sequence into v_milestone_id, v_sequence
  from public.template_items i
  join public.milestones m on m.id = i.milestone_id
  join public.templates t on t.id = m.template_id
  where i.id = p_item_id
    and i.is_active
    and m.is_active
    and t.status = 'draft';
  if not found then
    raise exception 'Active item in a draft template not found'
      using errcode = 'P0002';
  end if;

  select i.id, i.sequence into v_neighbor_id, v_neighbor_sequence
  from public.template_items i
  where i.milestone_id = v_milestone_id
    and i.is_active
    and (
      (p_direction = 'up' and i.sequence < v_sequence)
      or (p_direction = 'down' and i.sequence > v_sequence)
    )
  order by
    case when p_direction = 'up' then i.sequence end desc,
    case when p_direction = 'down' then i.sequence end asc
  limit 1;
  if not found then
    return;
  end if;

  select coalesce(max(sequence), 0) + 1 into v_temporary_sequence
  from public.template_items where milestone_id = v_milestone_id;
  update public.template_items set sequence = v_temporary_sequence
    where id = p_item_id;
  update public.template_items set sequence = v_sequence
    where id = v_neighbor_id;
  update public.template_items set sequence = v_neighbor_sequence
    where id = p_item_id;
end;
$$;

create or replace function public.remove_template_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.template_items i set is_active = false
  from public.milestones m
  join public.templates t on t.id = m.template_id
  where i.id = p_item_id
    and i.milestone_id = m.id
    and i.is_active
    and m.is_active
    and t.status = 'draft';
  if not found then
    raise exception 'Active item in a draft template not found'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.archive_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.templates set status = 'archived'
    where id = p_template_id and status <> 'archived';
  if not found then
    raise exception 'Template not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.create_content_draft(jsonb) from public;
revoke all on function public.publish_content(uuid, jsonb, text) from public;
revoke all on function public.archive_content(uuid) from public;
revoke all on function public.create_template_draft(jsonb) from public;
revoke all on function public.update_template_draft(uuid, jsonb) from public;
revoke all on function public.add_template_milestone(uuid, text, integer, integer) from public;
revoke all on function public.add_template_item(uuid, uuid, integer, boolean, integer, integer, text, boolean, jsonb) from public;
revoke all on function public.publish_template(uuid) from public;
revoke all on function public.reopen_template_draft(uuid) from public;
revoke all on function public.update_template_milestone(uuid, text, integer) from public;
revoke all on function public.move_template_milestone(uuid, text) from public;
revoke all on function public.remove_template_milestone(uuid) from public;
revoke all on function public.update_template_item(uuid, boolean, integer, integer, text, boolean) from public;
revoke all on function public.move_template_item(uuid, text) from public;
revoke all on function public.remove_template_item(uuid) from public;
revoke all on function public.archive_template(uuid) from public;

grant execute on function public.create_content_draft(jsonb) to authenticated;
grant execute on function public.publish_content(uuid, jsonb, text) to authenticated;
grant execute on function public.archive_content(uuid) to authenticated;
grant execute on function public.create_template_draft(jsonb) to authenticated;
grant execute on function public.update_template_draft(uuid, jsonb) to authenticated;
grant execute on function public.add_template_milestone(uuid, text, integer, integer) to authenticated;
grant execute on function public.add_template_item(uuid, uuid, integer, boolean, integer, integer, text, boolean, jsonb) to authenticated;
grant execute on function public.publish_template(uuid) to authenticated;
grant execute on function public.reopen_template_draft(uuid) to authenticated;
grant execute on function public.update_template_milestone(uuid, text, integer) to authenticated;
grant execute on function public.move_template_milestone(uuid, text) to authenticated;
grant execute on function public.remove_template_milestone(uuid) to authenticated;
grant execute on function public.update_template_item(uuid, boolean, integer, integer, text, boolean) to authenticated;
grant execute on function public.move_template_item(uuid, text) to authenticated;
grant execute on function public.remove_template_item(uuid) to authenticated;
grant execute on function public.archive_template(uuid) to authenticated;
