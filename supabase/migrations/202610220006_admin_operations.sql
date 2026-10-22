alter table public.journey_activities
  drop constraint journey_activities_completion_source_check,
  add constraint journey_activities_completion_source_check check (
    completion_source in (
      'employee_self_confirmation',
      'content_acknowledgement',
      'form_submission',
      'quiz_participation',
      'quiz_pass',
      'hr_admin'
    )
  );

create or replace function public.manage_journey_activity(
  p_activity_id uuid,
  p_action text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity public.journey_activities%rowtype;
  v_journey public.employee_journeys%rowtype;
  v_event_type text;
  v_status text;
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if p_action is null
     or p_action not in ('complete', 'waive', 'reopen')
     or nullif(trim(p_note), '') is null
     or length(p_note) > 500 then
    raise exception 'Choose a valid action and provide an audit note'
      using errcode = '22023';
  end if;

  select * into v_activity
  from public.journey_activities
  where id = p_activity_id
  for update;
  if not found then
    raise exception 'Activity not found' using errcode = 'P0002';
  end if;

  select * into v_journey
  from public.employee_journeys
  where id = v_activity.journey_id;
  if not found or v_journey.status <> 'active' then
    raise exception 'Activity does not belong to an active journey'
      using errcode = '55000';
  end if;

  if p_action = 'complete' then
    if v_activity.status in ('completed', 'waived', 'removed') then
      raise exception 'Activity cannot be completed in its current state'
        using errcode = '55000';
    end if;
    update public.journey_activities set
      status = 'completed',
      completed_at = now(),
      completed_by = auth.uid(),
      completion_source = 'hr_admin',
      completion_note = trim(p_note)
    where id = p_activity_id;
    v_event_type := 'admin_completed';
    v_status := 'completed';
  elsif p_action = 'waive' then
    if v_activity.status in ('completed', 'waived', 'removed') then
      raise exception 'Activity cannot be waived in its current state'
        using errcode = '55000';
    end if;
    update public.journey_activities set
      status = 'waived',
      completed_at = null,
      completed_by = null,
      completion_source = null,
      completion_note = trim(p_note)
    where id = p_activity_id;
    v_event_type := 'waived';
    v_status := 'waived';
  else
    if v_activity.status not in ('completed', 'waived') then
      raise exception 'Only completed or waived activities can be reopened'
        using errcode = '55000';
    end if;
    update public.journey_activities set
      status = 'not_started',
      completed_at = null,
      completed_by = null,
      completion_source = null,
      completion_note = null
    where id = p_activity_id;
    v_event_type := 'reopened';
    v_status := 'not_started';
  end if;

  insert into public.activity_events (
    journey_activity_id, journey_id, actor_id, event_type, event_data
  ) values (
    p_activity_id,
    v_activity.journey_id,
    auth.uid(),
    v_event_type,
    jsonb_build_object('note', trim(p_note), 'status', v_status)
  );

  return jsonb_build_object(
    'activity_id', p_activity_id,
    'status', v_status,
    'event_type', v_event_type
  );
end;
$$;

revoke all on function public.manage_journey_activity(uuid, text, text)
  from public;
grant execute on function public.manage_journey_activity(uuid, text, text)
  to authenticated;

create or replace function public.upsert_support_contact(
  p_contact_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_display_name text := nullif(trim(p_payload ->> 'display_name'), '');
  v_support_role text := nullif(trim(p_payload ->> 'support_role'), '');
  v_scope_type text := coalesce(p_payload ->> 'scope_type', 'company');
  v_scope_value text := nullif(trim(p_payload ->> 'scope_value'), '');
  v_email text := nullif(trim(p_payload ->> 'contact_email'), '');
  v_phone text := nullif(trim(p_payload ->> 'contact_phone'), '');
  v_url text := nullif(trim(p_payload ->> 'contact_url'), '');
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
     or v_display_name is null or length(v_display_name) > 120
     or v_support_role is null or length(v_support_role) > 120
     or v_scope_type not in ('company', 'office', 'department', 'position', 'group', 'employee')
     or (v_scope_type = 'company' and v_scope_value is not null)
     or (v_scope_type <> 'company' and (v_scope_value is null or length(v_scope_value) > 160))
     or (v_email is null and v_phone is null and v_url is null)
     or (v_email is not null and length(v_email) > 320)
     or (v_email is not null and v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
     or (v_phone is not null and length(v_phone) > 80)
     or (v_url is not null and (length(v_url) > 1000 or v_url !~* '^https?://')) then
    raise exception 'Invalid support contact details' using errcode = '22023';
  end if;

  if p_contact_id is null then
    insert into public.support_contacts (
      display_name, support_role, scope_type, scope_value,
      contact_email, contact_phone, contact_url
    ) values (
      v_display_name, v_support_role, v_scope_type, v_scope_value,
      v_email, v_phone, v_url
    ) returning id into v_id;
  else
    update public.support_contacts set
      display_name = v_display_name,
      support_role = v_support_role,
      scope_type = v_scope_type,
      scope_value = v_scope_value,
      contact_email = v_email,
      contact_phone = v_phone,
      contact_url = v_url
    where id = p_contact_id
    returning id into v_id;
    if not found then
      raise exception 'Support contact not found' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.upsert_support_contact(uuid, jsonb) from public;
grant execute on function public.upsert_support_contact(uuid, jsonb)
  to authenticated;

create or replace function public.archive_support_contact(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_hr_admin() then
    raise exception 'HR Admin permission required' using errcode = '42501';
  end if;
  update public.support_contacts set is_active = false
  where id = p_contact_id;
  if not found then
    raise exception 'Support contact not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.archive_support_contact(uuid) from public;
grant execute on function public.archive_support_contact(uuid) to authenticated;
