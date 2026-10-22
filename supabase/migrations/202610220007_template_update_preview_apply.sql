alter table public.activity_events
  drop constraint activity_events_event_type_check,
  add constraint activity_events_event_type_check check (
    event_type in (
      'assigned', 'self_confirmed', 'content_acknowledged', 'form_submitted',
      'quiz_submitted', 'admin_completed', 'waived', 'reopened', 'note_added',
      'template_update_applied'
    )
  );

create table public.journey_template_updates (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.employee_journeys (id) on delete restrict,
  from_version integer not null check (from_version > 0),
  to_version integer not null check (to_version > from_version),
  added_count integer not null default 0 check (added_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  removed_count integer not null default 0 check (removed_count >= 0),
  preserved_count integer not null default 0 check (preserved_count >= 0),
  applied_by uuid not null references public.profiles (id),
  applied_at timestamptz not null default now(),
  unique (journey_id, to_version)
);

create index journey_template_updates_journey_idx
  on public.journey_template_updates (journey_id, applied_at desc);
alter table public.journey_template_updates enable row level security;
revoke all on table public.journey_template_updates from anon, authenticated;
grant select on table public.journey_template_updates to authenticated;
create policy journey_template_updates_hr_only
  on public.journey_template_updates for select to authenticated
  using (public.current_user_is_hr_admin());

create or replace function public.preview_template_journey_updates(
  p_template_id uuid
)
returns table (
  journey_id uuid,
  employee_id uuid,
  employee_name text,
  from_version integer,
  to_version integer,
  added_count integer,
  updated_count integer,
  removed_count integer,
  preserved_count integer,
  eligible boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.templates%rowtype;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;

  select * into v_template
  from public.templates
  where id = p_template_id and status = 'published';
  if not found then
    raise exception 'Published template not found' using errcode = 'P0002';
  end if;

  return query
  select
    j.id,
    j.employee_id,
    p.display_name,
    j.template_version,
    v_template.version_number,
    (
      select count(*)::integer
      from public.milestones m
      join public.template_items i on i.milestone_id = m.id
      left join public.journey_activities a
        on a.journey_id = j.id
        and a.source_template_item_id = i.id
      where m.template_id = v_template.id
        and m.is_active and i.is_active and a.id is null
    ),
    (
      select count(*)::integer
      from public.milestones m
      join public.template_items i on i.milestone_id = m.id
      join public.contents c on c.id = i.content_id
      join public.content_versions cv
        on cv.content_id = c.id
        and cv.version_number = c.current_version
        and cv.version_status = 'published'
      join public.journey_activities a
        on a.journey_id = j.id
        and a.source_template_item_id = i.id
      where m.template_id = v_template.id
        and m.is_active and i.is_active
        and a.status not in ('completed', 'waived')
        and (
          a.status = 'removed'
          or row(
            a.content_version,
            a.title_snapshot,
            a.description_snapshot,
            a.content_type_snapshot,
            a.content_body_snapshot,
            a.milestone_name_snapshot,
            a.milestone_sequence,
            a.activity_sequence,
            a.is_required,
            a.available_at,
            a.due_at,
            a.completion_rule,
            a.include_in_progress
          ) is distinct from row(
            c.current_version,
            c.title,
            c.description,
            c.content_type,
            cv.body,
            m.name,
            m.sequence,
            i.sequence,
            i.is_required,
            j.start_date + m.available_offset_days + i.available_offset_days,
            case when i.due_offset_days is null then null else
              j.start_date + m.available_offset_days + i.available_offset_days + i.due_offset_days
            end,
            i.completion_rule,
            i.include_in_progress
          )
        )
    ),
    (
      select count(*)::integer
      from public.journey_activities a
      where a.journey_id = j.id
        and a.status not in ('completed', 'waived', 'removed')
        and not exists (
          select 1
          from public.template_items i
          join public.milestones m on m.id = i.milestone_id
          where i.id = a.source_template_item_id
            and i.is_active and m.is_active
            and m.template_id = v_template.id
        )
    ),
    (
      select count(*)::integer
      from public.journey_activities a
      where a.journey_id = j.id and a.status in ('completed', 'waived')
    ),
    (
      exists (
        select 1
        from public.milestones m
        join public.template_items i on i.milestone_id = m.id
        where m.template_id = v_template.id and m.is_active and i.is_active
      )
      and p.role = 'employee'
      and p.is_active
      and coalesce(
        case v_template.scope_type
          when 'company' then true
          when 'office' then p.office = v_template.scope_value
          when 'department' then p.department = v_template.scope_value
          when 'position' then p.position = v_template.scope_value
          when 'group' then p.audience_group = v_template.scope_value
          when 'employee' then p.id::text = v_template.scope_value
          else false
        end,
        false
      )
      and not exists (
        select 1
        from public.milestones m
        join public.template_items i on i.milestone_id = m.id
        left join public.contents c on c.id = i.content_id
        left join public.content_versions cv
          on cv.content_id = c.id
          and cv.version_number = c.current_version
          and cv.version_status = 'published'
        left join public.content_private_configs pc
          on pc.content_id = c.id and pc.version_number = c.current_version
        where m.template_id = v_template.id
          and m.is_active and i.is_active
          and (
            c.id is null or c.status <> 'published' or cv.content_id is null
            or not coalesce(
              case c.scope_type
                when 'company' then true
                when 'office' then p.office = c.scope_value
                when 'department' then p.department = c.scope_value
                when 'position' then p.position = c.scope_value
                when 'group' then p.audience_group = c.scope_value
                when 'employee' then p.id::text = c.scope_value
                else false
              end,
              false
            )
            or (i.completion_rule = 'manual_self_confirmation' and c.content_type <> 'task')
            or (i.completion_rule = 'form_submission' and (
              c.content_type <> 'quiz_form' or cv.body ->> 'kind' is distinct from 'form'
            ))
            or (i.completion_rule in ('quiz_participation', 'quiz_pass_required') and (
              c.content_type <> 'quiz_form'
              or cv.body ->> 'kind' is distinct from 'quiz'
              or jsonb_typeof(cv.body -> 'options') is distinct from 'array'
              or jsonb_typeof(pc.answer_config -> 'answer_index') is distinct from 'number'
            ))
          )
      )
    ),
    case
      when not exists (
        select 1 from public.milestones m
        join public.template_items i on i.milestone_id = m.id
        where m.template_id = v_template.id and m.is_active and i.is_active
      ) then 'Template has no active activities'
      when p.role <> 'employee' or not p.is_active then 'Employee profile is inactive'
      when not coalesce(
        case v_template.scope_type
          when 'company' then true
          when 'office' then p.office = v_template.scope_value
          when 'department' then p.department = v_template.scope_value
          when 'position' then p.position = v_template.scope_value
          when 'group' then p.audience_group = v_template.scope_value
          when 'employee' then p.id::text = v_template.scope_value
          else false
        end,
        false
      ) then 'Employee is outside the published template audience'
      when exists (
        select 1
        from public.milestones m
        join public.template_items i on i.milestone_id = m.id
        left join public.contents c on c.id = i.content_id
        left join public.content_versions cv
          on cv.content_id = c.id
          and cv.version_number = c.current_version
          and cv.version_status = 'published'
        left join public.content_private_configs pc
          on pc.content_id = c.id and pc.version_number = c.current_version
        where m.template_id = v_template.id
          and m.is_active and i.is_active
          and (
            c.id is null or c.status <> 'published' or cv.content_id is null
            or not coalesce(
              case c.scope_type
                when 'company' then true
                when 'office' then p.office = c.scope_value
                when 'department' then p.department = c.scope_value
                when 'position' then p.position = c.scope_value
                when 'group' then p.audience_group = c.scope_value
                when 'employee' then p.id::text = c.scope_value
                else false
              end,
              false
            )
            or (i.completion_rule = 'manual_self_confirmation' and c.content_type <> 'task')
            or (i.completion_rule = 'form_submission' and (
              c.content_type <> 'quiz_form' or cv.body ->> 'kind' is distinct from 'form'
            ))
            or (i.completion_rule in ('quiz_participation', 'quiz_pass_required') and (
              c.content_type <> 'quiz_form'
              or cv.body ->> 'kind' is distinct from 'quiz'
              or jsonb_typeof(cv.body -> 'options') is distinct from 'array'
              or jsonb_typeof(pc.answer_config -> 'answer_index') is distinct from 'number'
            ))
          )
      ) then 'Template contains unpublished, incompatible, or out-of-scope content'
      else null
    end
  from public.employee_journeys j
  join public.profiles p on p.id = j.employee_id
  where j.template_id = v_template.id
    and j.status = 'active'
    and j.template_version < v_template.version_number
  order by j.assigned_at, p.display_name;
end;
$$;

create or replace function public.apply_template_update_to_journey(
  p_journey_id uuid,
  p_expected_to_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_journey public.employee_journeys%rowtype;
  v_template public.templates%rowtype;
  v_profile public.profiles%rowtype;
  v_preview record;
  v_item record;
  v_removed record;
  v_activity_id uuid;
  v_added integer := 0;
  v_updated integer := 0;
  v_removed_count integer := 0;
  v_preserved integer := 0;
  v_changed boolean;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;

  select * into v_journey
  from public.employee_journeys
  where id = p_journey_id
  for update;
  if not found or v_journey.status <> 'active' then
    raise exception 'Active employee journey not found' using errcode = 'P0002';
  end if;

  select * into v_template
  from public.templates
  where id = v_journey.template_id and status = 'published'
  for update;
  if not found or p_expected_to_version is distinct from v_template.version_number then
    raise exception 'Template version changed after preview; reload the preview'
      using errcode = '40001';
  end if;
  if v_journey.template_version >= v_template.version_number then
    raise exception 'Journey is already on this template version'
      using errcode = '55000';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_journey.employee_id and role = 'employee' and is_active;
  if not found then
    raise exception 'Active employee profile not found' using errcode = 'P0002';
  end if;

  select * into v_preview
  from public.preview_template_journey_updates(v_template.id) preview
  where preview.journey_id = v_journey.id;
  if not found then
    raise exception 'No preview is available for this journey'
      using errcode = '55000';
  end if;
  if not v_preview.eligible then
    raise exception '%', coalesce(v_preview.reason, 'Template update is not eligible')
      using errcode = '22023';
  end if;

  for v_item in
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
      i.settings,
      a.id as existing_activity_id,
      a.status as existing_status
    from public.milestones m
    join public.template_items i on i.milestone_id = m.id
    join public.contents c on c.id = i.content_id
    join public.content_versions cv
      on cv.content_id = c.id
      and cv.version_number = c.current_version
      and cv.version_status = 'published'
    left join public.content_private_configs pc
      on pc.content_id = c.id and pc.version_number = c.current_version
    left join public.journey_activities a
      on a.journey_id = v_journey.id
      and a.source_template_item_id = i.id
    where m.template_id = v_template.id
      and m.is_active and i.is_active
    order by m.sequence, i.sequence
  loop
    if v_item.existing_activity_id is null then
      insert into public.journey_activities (
        journey_id, source_template_item_id, source_content_id, content_version,
        title_snapshot, description_snapshot, content_type_snapshot,
        content_body_snapshot, milestone_name_snapshot, milestone_sequence,
        activity_sequence, is_required, available_at, due_at, completion_rule,
        include_in_progress
      ) values (
        v_journey.id, v_item.template_item_id, v_item.content_id,
        v_item.current_version, v_item.title, v_item.description,
        v_item.content_type, v_item.body, v_item.milestone_name,
        v_item.milestone_sequence, v_item.activity_sequence, v_item.is_required,
        v_journey.start_date + v_item.milestone_offset_days + v_item.activity_offset_days,
        case when v_item.due_offset_days is null then null else
          v_journey.start_date + v_item.milestone_offset_days
            + v_item.activity_offset_days + v_item.due_offset_days
        end,
        v_item.completion_rule, v_item.include_in_progress
      ) returning id into v_activity_id;
      insert into public.journey_activity_private (
        journey_activity_id, answer_config_snapshot, settings_snapshot
      ) values (
        v_activity_id,
        coalesce(v_item.answer_config, '{}'::jsonb),
        coalesce(v_item.settings, '{}'::jsonb)
      );
      insert into public.activity_events (
        journey_activity_id, journey_id, actor_id, event_type, event_data
      ) values (
        v_activity_id, v_journey.id, auth.uid(), 'template_update_applied',
        jsonb_build_object('change', 'added', 'from_version', v_journey.template_version,
          'to_version', v_template.version_number)
      );
      v_added := v_added + 1;
    elsif v_item.existing_status in ('completed', 'waived') then
      v_preserved := v_preserved + 1;
    else
      select (
        a.status = 'removed'
        or row(
          a.content_version, a.title_snapshot, a.description_snapshot,
          a.content_type_snapshot, a.content_body_snapshot,
          a.milestone_name_snapshot, a.milestone_sequence,
          a.activity_sequence, a.is_required, a.available_at, a.due_at,
          a.completion_rule, a.include_in_progress
        ) is distinct from row(
          v_item.current_version, v_item.title, v_item.description,
          v_item.content_type, v_item.body, v_item.milestone_name,
          v_item.milestone_sequence, v_item.activity_sequence,
          v_item.is_required,
          v_journey.start_date + v_item.milestone_offset_days + v_item.activity_offset_days,
          case when v_item.due_offset_days is null then null else
            v_journey.start_date + v_item.milestone_offset_days
              + v_item.activity_offset_days + v_item.due_offset_days
          end,
          v_item.completion_rule, v_item.include_in_progress
        )
      ) into v_changed
      from public.journey_activities a
      where a.id = v_item.existing_activity_id;

      if v_changed then
        update public.journey_activities set
          source_content_id = v_item.content_id,
          content_version = v_item.current_version,
          title_snapshot = v_item.title,
          description_snapshot = v_item.description,
          content_type_snapshot = v_item.content_type,
          content_body_snapshot = v_item.body,
          milestone_name_snapshot = v_item.milestone_name,
          milestone_sequence = v_item.milestone_sequence,
          activity_sequence = v_item.activity_sequence,
          is_required = v_item.is_required,
          available_at = v_journey.start_date + v_item.milestone_offset_days + v_item.activity_offset_days,
          due_at = case when v_item.due_offset_days is null then null else
            v_journey.start_date + v_item.milestone_offset_days
              + v_item.activity_offset_days + v_item.due_offset_days
          end,
          completion_rule = v_item.completion_rule,
          include_in_progress = v_item.include_in_progress,
          status = case when status = 'removed' then 'not_started' else status end
        where id = v_item.existing_activity_id;
        insert into public.journey_activity_private (
          journey_activity_id, answer_config_snapshot, settings_snapshot
        ) values (
          v_item.existing_activity_id,
          coalesce(v_item.answer_config, '{}'::jsonb),
          coalesce(v_item.settings, '{}'::jsonb)
        ) on conflict (journey_activity_id) do update set
          answer_config_snapshot = excluded.answer_config_snapshot,
          settings_snapshot = excluded.settings_snapshot;
        insert into public.activity_events (
          journey_activity_id, journey_id, actor_id, event_type, event_data
        ) values (
          v_item.existing_activity_id, v_journey.id, auth.uid(),
          'template_update_applied',
          jsonb_build_object('change', 'updated', 'from_version', v_journey.template_version,
            'to_version', v_template.version_number)
        );
        v_updated := v_updated + 1;
      end if;
    end if;
  end loop;

  for v_removed in
    select a.id
    from public.journey_activities a
    where a.journey_id = v_journey.id
      and a.status not in ('completed', 'waived', 'removed')
      and not exists (
        select 1
        from public.template_items i
        join public.milestones m on m.id = i.milestone_id
        where i.id = a.source_template_item_id
          and i.is_active and m.is_active
          and m.template_id = v_template.id
      )
  loop
    update public.journey_activities set status = 'removed'
    where id = v_removed.id;
    insert into public.activity_events (
      journey_activity_id, journey_id, actor_id, event_type, event_data
    ) values (
      v_removed.id, v_journey.id, auth.uid(), 'template_update_applied',
      jsonb_build_object('change', 'removed', 'from_version', v_journey.template_version,
        'to_version', v_template.version_number)
    );
    v_removed_count := v_removed_count + 1;
  end loop;

  update public.employee_journeys set
    template_version = v_template.version_number,
    title_snapshot = v_template.name
  where id = v_journey.id;

  insert into public.journey_template_updates (
    journey_id, from_version, to_version, added_count, updated_count,
    removed_count, preserved_count, applied_by
  ) values (
    v_journey.id, v_journey.template_version, v_template.version_number,
    v_added, v_updated, v_removed_count, v_preserved, auth.uid()
  );

  return jsonb_build_object(
    'journey_id', v_journey.id,
    'from_version', v_journey.template_version,
    'to_version', v_template.version_number,
    'added_count', v_added,
    'updated_count', v_updated,
    'removed_count', v_removed_count,
    'preserved_count', v_preserved
  );
end;
$$;

revoke all on function public.preview_template_journey_updates(uuid) from public;
grant execute on function public.preview_template_journey_updates(uuid) to authenticated;
revoke all on function public.apply_template_update_to_journey(uuid, integer)
  from public;
grant execute on function public.apply_template_update_to_journey(uuid, integer)
  to authenticated;
