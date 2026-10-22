create table public.employee_journeys (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete restrict,
  template_id uuid not null references public.templates (id) on delete restrict,
  template_version integer not null check (template_version > 0),
  title_snapshot text not null,
  start_date date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused', 'cancelled')),
  assigned_by uuid not null references public.profiles (id),
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, template_id, template_version)
);

create index employee_journeys_employee_status_idx
  on public.employee_journeys (employee_id, status, start_date desc);
create trigger employee_journeys_set_updated_at
before update on public.employee_journeys
for each row execute function public.set_updated_at();

create table public.journey_activities (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.employee_journeys (id) on delete cascade,
  source_template_item_id uuid not null references public.template_items (id) on delete restrict,
  source_content_id uuid not null references public.contents (id) on delete restrict,
  content_version integer not null check (content_version > 0),
  title_snapshot text not null,
  description_snapshot text not null default '',
  content_type_snapshot text not null,
  content_body_snapshot jsonb not null check (jsonb_typeof(content_body_snapshot) = 'object'),
  milestone_name_snapshot text not null,
  milestone_sequence integer not null check (milestone_sequence >= 0),
  activity_sequence integer not null check (activity_sequence >= 0),
  is_required boolean not null,
  available_at date not null,
  due_at date,
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
  include_in_progress boolean not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'waived')),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  completion_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journey_id, source_template_item_id),
  unique (id, journey_id),
  check ((status = 'completed' and completed_at is not null and completed_by is not null)
    or (status <> 'completed' and completed_at is null and completed_by is null))
);

create index journey_activities_journey_order_idx
  on public.journey_activities (journey_id, milestone_sequence, activity_sequence);
create index journey_activities_due_idx
  on public.journey_activities (due_at, status)
  where due_at is not null;
create trigger journey_activities_set_updated_at
before update on public.journey_activities
for each row execute function public.set_updated_at();

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  journey_activity_id uuid not null,
  journey_id uuid not null,
  actor_id uuid not null references public.profiles (id),
  event_type text not null check (
    event_type in ('assigned', 'self_confirmed', 'admin_completed', 'waived', 'reopened', 'note_added')
  ),
  event_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_data) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (journey_activity_id, journey_id)
    references public.journey_activities (id, journey_id) on delete cascade
);

create index activity_events_activity_created_idx
  on public.activity_events (journey_activity_id, created_at desc);

alter table public.employee_journeys enable row level security;
alter table public.journey_activities enable row level security;
alter table public.activity_events enable row level security;

revoke all on table
  public.employee_journeys,
  public.journey_activities,
  public.activity_events
from anon, authenticated;
grant select on table
  public.employee_journeys,
  public.journey_activities,
  public.activity_events
to authenticated;

create policy employee_journeys_select_owner_or_hr
  on public.employee_journeys for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or employee_id = auth.uid()
  );

create policy journey_activities_select_owner_or_hr
  on public.journey_activities for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or exists (
      select 1 from public.employee_journeys j
      where j.id = journey_activities.journey_id
        and j.employee_id = auth.uid()
    )
  );

create policy activity_events_select_owner_or_hr
  on public.activity_events for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or exists (
      select 1
      from public.employee_journeys j
      where j.id = activity_events.journey_id
        and j.employee_id = auth.uid()
    )
  );

create or replace function public.assign_template_to_employee(
  p_template_id uuid,
  p_employee_id uuid,
  p_start_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.templates%rowtype;
  v_employee public.profiles%rowtype;
  v_journey_id uuid;
  v_activity_id uuid;
  v_activity record;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if p_start_date is null then
    raise exception 'A start date is required' using errcode = '22023';
  end if;

  select * into v_template
  from public.templates
  where id = p_template_id and status = 'published' and version_number > 0;
  if not found then
    raise exception 'Published template not found' using errcode = 'P0002';
  end if;

  select * into v_employee
  from public.profiles
  where id = p_employee_id and role = 'employee' and is_active;
  if not found then
    raise exception 'Active employee not found' using errcode = 'P0002';
  end if;

  if not coalesce(
    case v_template.scope_type
      when 'company' then true
      when 'office' then v_employee.office = v_template.scope_value
      when 'department' then v_employee.department = v_template.scope_value
      when 'position' then v_employee.position = v_template.scope_value
      when 'group' then v_employee.audience_group = v_template.scope_value
      when 'employee' then v_employee.id::text = v_template.scope_value
      else false
    end,
    false
  ) then
    raise exception 'Employee is outside the template audience'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.milestones m
    join public.template_items i on i.milestone_id = m.id
    join public.contents c on c.id = i.content_id
    join public.content_versions cv
      on cv.content_id = c.id
      and cv.version_number = c.current_version
      and cv.version_status = 'published'
    where m.template_id = p_template_id
      and m.is_active
      and i.is_active
      and c.status = 'published'
      and c.current_version > 0
      and coalesce(
        case c.scope_type
          when 'company' then true
          when 'office' then v_employee.office = c.scope_value
          when 'department' then v_employee.department = c.scope_value
          when 'position' then v_employee.position = c.scope_value
          when 'group' then v_employee.audience_group = c.scope_value
          when 'employee' then v_employee.id::text = c.scope_value
          else false
        end,
        false
      )
  ) then
    raise exception 'Template has no published activities for this employee'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.milestones m
    join public.template_items i on i.milestone_id = m.id
    join public.contents c on c.id = i.content_id
    where m.template_id = p_template_id
      and m.is_active
      and i.is_active
      and (
        c.status <> 'published'
        or c.current_version < 1
        or not exists (
          select 1 from public.content_versions cv
          where cv.content_id = c.id
            and cv.version_number = c.current_version
            and cv.version_status = 'published'
        )
        or not coalesce(
          case c.scope_type
            when 'company' then true
            when 'office' then v_employee.office = c.scope_value
            when 'department' then v_employee.department = c.scope_value
            when 'position' then v_employee.position = c.scope_value
            when 'group' then v_employee.audience_group = c.scope_value
            when 'employee' then v_employee.id::text = c.scope_value
            else false
          end,
          false
        )
      )
  ) then
    raise exception 'Template contains unavailable or out-of-scope content'
      using errcode = '22023';
  end if;

  insert into public.employee_journeys (
    employee_id, template_id, template_version, title_snapshot,
    start_date, status, assigned_by
  )
  values (
    p_employee_id, v_template.id, v_template.version_number, v_template.name,
    p_start_date, 'active', auth.uid()
  )
  on conflict (employee_id, template_id, template_version) do nothing
  returning id into v_journey_id;

  if v_journey_id is null then
    select id into v_journey_id
    from public.employee_journeys
    where employee_id = p_employee_id
      and template_id = v_template.id
      and template_version = v_template.version_number;
    return v_journey_id;
  end if;

  for v_activity in
    select
      i.id as template_item_id,
      i.content_id,
      i.sequence as activity_sequence,
      i.is_required,
      i.available_offset_days as activity_offset_days,
      i.due_offset_days,
      i.completion_rule,
      i.include_in_progress,
      m.name as milestone_name,
      m.sequence as milestone_sequence,
      m.available_offset_days as milestone_offset_days,
      c.current_version,
      c.title,
      c.description,
      c.content_type,
      cv.body,
      pc.answer_config,
      i.settings
    from public.milestones m
    join public.template_items i on i.milestone_id = m.id
    join public.contents c on c.id = i.content_id
    join public.content_versions cv
      on cv.content_id = c.id
      and cv.version_number = c.current_version
      and cv.version_status = 'published'
    left join public.content_private_configs pc
      on pc.content_id = c.id
      and pc.version_number = c.current_version
    where m.template_id = p_template_id
      and m.is_active
      and i.is_active
    order by m.sequence, i.sequence
  loop
    v_activity_id := null;
    insert into public.journey_activities (
      journey_id, source_template_item_id, source_content_id, content_version,
      title_snapshot, description_snapshot, content_type_snapshot,
      content_body_snapshot, milestone_name_snapshot, milestone_sequence,
      activity_sequence, is_required, available_at, due_at, completion_rule,
      include_in_progress
    )
    values (
      v_journey_id,
      v_activity.template_item_id,
      v_activity.content_id,
      v_activity.current_version,
      v_activity.title,
      v_activity.description,
      v_activity.content_type,
      v_activity.body,
      v_activity.milestone_name,
      v_activity.milestone_sequence,
      v_activity.activity_sequence,
      v_activity.is_required,
      p_start_date + v_activity.milestone_offset_days + v_activity.activity_offset_days,
      case when v_activity.due_offset_days is null then null else
        p_start_date + v_activity.milestone_offset_days
          + v_activity.activity_offset_days + v_activity.due_offset_days
      end,
      v_activity.completion_rule,
      v_activity.include_in_progress
    )
    on conflict (journey_id, source_template_item_id) do nothing
    returning id into v_activity_id;

    if v_activity_id is not null then
      insert into public.journey_activity_private (
        journey_activity_id, answer_config_snapshot, settings_snapshot
      ) values (
        v_activity_id,
        coalesce(v_activity.answer_config, '{}'::jsonb),
        coalesce(v_activity.settings, '{}'::jsonb)
      );
      insert into public.activity_events (
        journey_activity_id, journey_id, actor_id, event_type, event_data
      ) values (
        v_activity_id,
        v_journey_id,
        auth.uid(),
        'assigned',
        jsonb_build_object(
          'template_id', v_template.id,
          'template_version', v_template.version_number
        )
      );
    end if;
  end loop;

  return v_journey_id;
end;
$$;

revoke all on function public.assign_template_to_employee(uuid, uuid, date)
  from public;
grant execute on function public.assign_template_to_employee(uuid, uuid, date)
  to authenticated;
