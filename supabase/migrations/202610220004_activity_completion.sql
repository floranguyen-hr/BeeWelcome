alter table public.journey_activities
  drop constraint journey_activities_status_check;
update public.journey_activities set status = 'not_started' where status = 'pending';
alter table public.journey_activities
  alter column status set default 'not_started',
  add constraint journey_activities_status_check
    check (status in ('not_started', 'in_progress', 'completed', 'waived', 'removed'));

alter table public.journey_activities
  add column completion_source text check (
    completion_source in (
      'employee_self_confirmation',
      'content_acknowledgement',
      'form_submission',
      'quiz_participation',
      'quiz_pass'
    )
  );

alter table public.activity_events
  drop constraint activity_events_event_type_check,
  add constraint activity_events_event_type_check check (
    event_type in (
      'assigned', 'self_confirmed', 'content_acknowledged', 'form_submitted',
      'quiz_submitted', 'admin_completed', 'waived', 'reopened', 'note_added'
    )
  );

create table public.content_private_configs (
  content_id uuid not null,
  version_number integer not null,
  answer_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answer_config) = 'object'),
  created_at timestamptz not null default now(),
  primary key (content_id, version_number),
  foreign key (content_id, version_number)
    references public.content_versions (content_id, version_number) on delete restrict
);

alter table public.content_private_configs enable row level security;
revoke all on table public.content_private_configs from anon, authenticated;
grant select on table public.content_private_configs to authenticated;
create policy content_private_configs_hr_only
  on public.content_private_configs for select to authenticated
  using (public.current_user_is_hr_admin());

create table public.journey_activity_private (
  journey_activity_id uuid primary key
    references public.journey_activities (id) on delete cascade,
  answer_config_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answer_config_snapshot) = 'object'),
  settings_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings_snapshot) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.journey_activity_private enable row level security;
revoke all on table public.journey_activity_private from public, anon, authenticated;

create table public.activity_submissions (
  id uuid primary key default gen_random_uuid(),
  journey_activity_id uuid not null,
  journey_id uuid not null,
  employee_id uuid not null references public.profiles (id),
  answer_payload jsonb not null check (jsonb_typeof(answer_payload) = 'object'),
  score numeric(5, 4) check (score is null or (score >= 0 and score <= 1)),
  passed boolean,
  submitted_at timestamptz not null default now(),
  foreign key (journey_activity_id, journey_id)
    references public.journey_activities (id, journey_id) on delete cascade
);

create index activity_submissions_employee_idx
  on public.activity_submissions (employee_id, submitted_at desc);
create index activity_submissions_activity_idx
  on public.activity_submissions (journey_activity_id, submitted_at desc);
alter table public.activity_submissions enable row level security;
revoke all on table public.activity_submissions from anon, authenticated;
grant select on table public.activity_submissions to authenticated;
create policy activity_submissions_select_owner_or_hr
  on public.activity_submissions for select to authenticated
  using (
    public.current_user_is_hr_admin()
    or employee_id = auth.uid()
  );

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
  v_body jsonb;
  v_public_body jsonb;
  v_answer_config jsonb := '{}'::jsonb;
  v_options_count integer;
  v_answer_index integer;
  v_passing_score numeric;
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

  v_body := p_payload -> 'body';
  v_public_body := v_body;
  if p_payload ->> 'content_type' = 'quiz_form' and v_body ->> 'kind' = 'quiz' then
    if jsonb_typeof(v_body -> 'options') <> 'array'
       or jsonb_array_length(v_body -> 'options') < 2
       or jsonb_array_length(v_body -> 'options') > 10
       or jsonb_typeof(v_body -> 'answer_index') <> 'number'
       or (v_body ->> 'answer_index') !~ '^[0-9]+$' then
      raise exception 'Quiz content needs 2-10 options and one integer answer index'
        using errcode = '22023';
    end if;
    v_options_count := jsonb_array_length(v_body -> 'options');
    v_answer_index := (v_body ->> 'answer_index')::integer;
    if v_answer_index < 0 or v_answer_index >= v_options_count then
      raise exception 'Quiz answer index is outside the option list'
        using errcode = '22023';
    end if;
    v_passing_score := coalesce((v_body ->> 'passing_score')::numeric, 1);
    if v_passing_score < 0 or v_passing_score > 1 then
      raise exception 'Quiz passing score must be between 0 and 1'
        using errcode = '22023';
    end if;
    v_answer_config := jsonb_build_object(
      'answer_index', v_answer_index,
      'passing_score', v_passing_score
    );
    v_public_body := v_body - 'answer_index' - 'passing_score';
  elsif p_payload ->> 'content_type' = 'quiz_form' and v_body ->> 'kind' = 'form' then
    if jsonb_typeof(v_body -> 'fields') <> 'array'
       or jsonb_array_length(v_body -> 'fields') < 1
       or jsonb_array_length(v_body -> 'fields') > 12 then
      raise exception 'Form content needs between 1 and 12 fields'
        using errcode = '22023';
    end if;
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
      body = v_public_body,
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
      ) values (
        p_content_id, v_version, v_public_body, p_change_note,
        'published', auth.uid(), auth.uid(), now()
      );
    end if;
  else
    v_version := v_content.current_version + 1;
    insert into public.content_versions (
      content_id, version_number, body, change_note,
      version_status, created_by, published_by, published_at
    ) values (
      p_content_id, v_version, v_public_body, p_change_note,
      'published', auth.uid(), auth.uid(), now()
    );
  end if;

  insert into public.content_private_configs (
    content_id, version_number, answer_config
  ) values (
    p_content_id, v_version, v_answer_config
  ) on conflict (content_id, version_number) do update set
    answer_config = excluded.answer_config;

  update public.contents set
    current_version = v_version,
    status = 'published'
  where id = p_content_id;

  return v_version;
end;
$$;

create or replace function public.validate_template_item_completion_rule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content public.contents%rowtype;
  v_body jsonb;
  v_answer_config jsonb;
begin
  select c.* into v_content
  from public.contents c
  where c.id = new.content_id and c.status = 'published';
  if not found then
    raise exception 'Template activities require published content'
      using errcode = '22023';
  end if;

  select cv.body into v_body
  from public.content_versions cv
  where cv.content_id = v_content.id
    and cv.version_number = v_content.current_version
    and cv.version_status = 'published';
  select pc.answer_config into v_answer_config
  from public.content_private_configs pc
  where pc.content_id = v_content.id
    and pc.version_number = v_content.current_version;

  if new.completion_rule = 'manual_self_confirmation'
     and v_content.content_type <> 'task' then
    raise exception 'Manual self-confirmation requires task content'
      using errcode = '22023';
  end if;
  if new.completion_rule = 'form_submission'
     and (v_content.content_type <> 'quiz_form' or v_body ->> 'kind' is distinct from 'form') then
    raise exception 'Form submission requires configured form content'
      using errcode = '22023';
  end if;
  if new.completion_rule in ('quiz_participation', 'quiz_pass_required')
     and (
       v_content.content_type <> 'quiz_form'
       or v_body ->> 'kind' is distinct from 'quiz'
       or jsonb_typeof(v_body -> 'options') <> 'array'
       or jsonb_typeof(v_answer_config -> 'answer_index') <> 'number'
     ) then
    raise exception 'Quiz completion requires configured quiz content and a private answer key'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_template_item_completion_rule() from public;
drop trigger if exists template_items_validate_completion_rule
  on public.template_items;
create trigger template_items_validate_completion_rule
before insert or update of content_id, completion_rule
on public.template_items
for each row execute function public.validate_template_item_completion_rule();

create or replace function public.complete_journey_activity(
  p_activity_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activity public.journey_activities%rowtype;
  v_journey public.employee_journeys%rowtype;
  v_profile public.profiles%rowtype;
  v_private public.journey_activity_private%rowtype;
  v_answers jsonb;
  v_field jsonb;
  v_answer_text text;
  v_answer_index integer;
  v_correct_index integer;
  v_options_count integer;
  v_score numeric(5, 4);
  v_passing_score numeric;
  v_passed boolean;
  v_completed boolean := false;
  v_source text;
  v_event_type text;
  v_note text;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'A valid activity payload is required' using errcode = '22023';
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
  select * into v_profile
  from public.profiles
  where id = auth.uid() and role = 'employee' and is_active;
  if not found or v_journey.employee_id <> auth.uid() or v_journey.status <> 'active' then
    raise exception 'Only the assigned active employee can complete this activity'
      using errcode = '42501';
  end if;
  if v_activity.available_at > current_date then
    raise exception 'This activity is still locked' using errcode = '55000';
  end if;
  if v_activity.status in ('completed', 'waived', 'removed') then
    raise exception 'This activity cannot be completed in its current state'
      using errcode = '55000';
  end if;

  select * into v_private
  from public.journey_activity_private
  where journey_activity_id = p_activity_id;
  v_note := nullif(trim(p_payload ->> 'note'), '');
  if length(coalesce(v_note, '')) > 500 then
    raise exception 'Completion note is too long' using errcode = '22023';
  end if;

  case v_activity.completion_rule
    when 'manual_self_confirmation' then
      if p_payload ->> 'confirmed' <> 'true' then
        raise exception 'Confirm that you completed the offline task'
          using errcode = '22023';
      end if;
      v_completed := true;
      v_source := 'employee_self_confirmation';
      v_event_type := 'self_confirmed';
    when 'content_acknowledgement' then
      if p_payload ->> 'acknowledged' <> 'true' then
        raise exception 'Acknowledge the content to complete this activity'
          using errcode = '22023';
      end if;
      v_completed := true;
      v_source := 'content_acknowledgement';
      v_event_type := 'content_acknowledged';
    when 'form_submission' then
      v_answers := p_payload -> 'answers';
      if jsonb_typeof(v_answers) <> 'object'
         or jsonb_typeof(v_activity.content_body_snapshot -> 'fields') <> 'array' then
        raise exception 'A valid form response is required' using errcode = '22023';
      end if;
      for v_field in
        select value from jsonb_array_elements(v_activity.content_body_snapshot -> 'fields')
      loop
        v_answer_text := v_answers ->> (v_field ->> 'name');
        if coalesce((v_field ->> 'required')::boolean, false)
           and nullif(trim(v_answer_text), '') is null then
          raise exception 'A required form field is missing' using errcode = '22023';
        end if;
        if length(coalesce(v_answer_text, '')) > 2000 then
          raise exception 'A form answer is too long' using errcode = '22023';
        end if;
        if v_answer_text is not null and v_field ->> 'type' = 'choice'
           and not exists (
             select 1
             from jsonb_array_elements_text(v_field -> 'options') as option_row(value)
             where option_row.value = v_answer_text
           ) then
          raise exception 'A form choice is not valid' using errcode = '22023';
        end if;
      end loop;
      if exists (
        select 1 from jsonb_object_keys(v_answers) as answer_row(key)
        where not exists (
          select 1
          from jsonb_array_elements(v_activity.content_body_snapshot -> 'fields') as field_value
          where field_value ->> 'name' = answer_row.key
        )
      ) then
        raise exception 'The form contains an unknown field' using errcode = '22023';
      end if;
      insert into public.activity_submissions (
        journey_activity_id, journey_id, employee_id, answer_payload, passed
      ) values (p_activity_id, v_journey.id, auth.uid(), v_answers, true);
      v_completed := true;
      v_source := 'form_submission';
      v_event_type := 'form_submitted';
    when 'quiz_participation' then
      v_completed := false;
      v_source := 'quiz_participation';
      v_event_type := 'quiz_submitted';
      v_passing_score := coalesce(
        (v_private.answer_config_snapshot ->> 'passing_score')::numeric, 1
      );
      v_answers := jsonb_build_object('answer_index', p_payload -> 'answer_index');
      if jsonb_typeof(p_payload -> 'answer_index') <> 'number'
         or (p_payload ->> 'answer_index') !~ '^[0-9]+$'
         or v_activity.content_body_snapshot ->> 'kind' <> 'quiz'
         or jsonb_typeof(v_activity.content_body_snapshot -> 'options') <> 'array' then
        raise exception 'A valid quiz answer is required' using errcode = '22023';
      end if;
      v_options_count := jsonb_array_length(v_activity.content_body_snapshot -> 'options');
      v_answer_index := (p_payload ->> 'answer_index')::integer;
      if v_answer_index < 0 or v_answer_index >= v_options_count then
        raise exception 'Quiz answer is outside the option list' using errcode = '22023';
      end if;
      if jsonb_typeof(v_private.answer_config_snapshot -> 'answer_index') <> 'number' then
        raise exception 'Quiz scoring configuration is unavailable' using errcode = '55000';
      end if;
      v_correct_index := (v_private.answer_config_snapshot ->> 'answer_index')::integer;
      v_score := case when v_answer_index = v_correct_index then 1 else 0 end;
      v_passed := v_score >= v_passing_score;
      insert into public.activity_submissions (
        journey_activity_id, journey_id, employee_id, answer_payload, score, passed
      ) values (
        p_activity_id, v_journey.id, auth.uid(), v_answers, v_score, v_passed
      );
      v_completed := true;
    when 'quiz_pass_required' then
      v_completed := false;
      v_source := 'quiz_pass';
      v_event_type := 'quiz_submitted';
      v_passing_score := coalesce(
        (v_private.answer_config_snapshot ->> 'passing_score')::numeric, 1
      );
      v_answers := jsonb_build_object('answer_index', p_payload -> 'answer_index');
      if jsonb_typeof(p_payload -> 'answer_index') <> 'number'
         or (p_payload ->> 'answer_index') !~ '^[0-9]+$'
         or v_activity.content_body_snapshot ->> 'kind' <> 'quiz'
         or jsonb_typeof(v_activity.content_body_snapshot -> 'options') <> 'array' then
        raise exception 'A valid quiz answer is required' using errcode = '22023';
      end if;
      v_options_count := jsonb_array_length(v_activity.content_body_snapshot -> 'options');
      v_answer_index := (p_payload ->> 'answer_index')::integer;
      if v_answer_index < 0 or v_answer_index >= v_options_count then
        raise exception 'Quiz answer is outside the option list' using errcode = '22023';
      end if;
      if jsonb_typeof(v_private.answer_config_snapshot -> 'answer_index') <> 'number' then
        raise exception 'Quiz scoring configuration is unavailable' using errcode = '55000';
      end if;
      v_correct_index := (v_private.answer_config_snapshot ->> 'answer_index')::integer;
      v_score := case when v_answer_index = v_correct_index then 1 else 0 end;
      v_passed := v_score >= v_passing_score;
      insert into public.activity_submissions (
        journey_activity_id, journey_id, employee_id, answer_payload, score, passed
      ) values (
        p_activity_id, v_journey.id, auth.uid(), v_answers, v_score, v_passed
      );
      v_completed := v_passed;
    else
      raise exception 'This activity requires an HR Admin action that is not enabled'
        using errcode = '55000';
  end case;

  if v_completed then
    update public.journey_activities set
      status = 'completed',
      completed_at = now(),
      completed_by = auth.uid(),
      completion_source = v_source,
      completion_note = v_note
    where id = p_activity_id;
  else
    update public.journey_activities set status = 'in_progress'
      where id = p_activity_id;
  end if;

  insert into public.activity_events (
    journey_activity_id, journey_id, actor_id, event_type, event_data
  ) values (
    p_activity_id,
    v_journey.id,
    auth.uid(),
    v_event_type,
    jsonb_strip_nulls(jsonb_build_object(
      'score', v_score,
      'passed', v_passed,
      'completed', v_completed,
      'completion_source', v_source
    ))
  );

  return jsonb_strip_nulls(jsonb_build_object(
    'completed', v_completed,
    'score', v_score,
    'passed', v_passed,
    'completion_source', v_source
  ));
end;
$$;

revoke all on function public.complete_journey_activity(uuid, jsonb) from public;
grant execute on function public.complete_journey_activity(uuid, jsonb) to authenticated;
