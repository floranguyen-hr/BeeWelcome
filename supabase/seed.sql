-- Synthetic demo data only. Create identities with scripts/provision-demo-accounts.ps1
-- before running this file explicitly. During a fresh `supabase db reset`, the
-- seed is invoked before those identities exist, so it safely prints a notice.
do $seed$
declare
  v_admin public.profiles%rowtype;
  v_employee_a public.profiles%rowtype;
  v_employee_b public.profiles%rowtype;
  v_template public.templates%rowtype;
begin
  select * into v_admin from public.profiles
  where email = 'hr-admin@bee-onboarding.invalid' and role = 'hr_admin' and is_active;
  select * into v_employee_a from public.profiles
  where email = 'employee-a@bee-onboarding.invalid' and role = 'employee' and is_active;
  select * into v_employee_b from public.profiles
  where email = 'employee-b@bee-onboarding.invalid' and role = 'employee' and is_active;

  if v_admin.id is null or v_employee_a.id is null or v_employee_b.id is null then
    raise notice 'Demo accounts are missing. Provision the demo accounts, then run scripts/seed-demo-data.ps1.';
  else
    update public.profiles set
      office = 'Demo Office A',
      department = 'Demo Operations',
      position = 'Demo Associate',
      audience_group = 'Demo Group A',
      start_date = current_date - 1
    where id = v_employee_a.id;
    update public.profiles set
      office = 'Demo Office B',
      department = 'Demo Operations',
      position = 'Demo Associate',
      audience_group = 'Demo Group B',
      start_date = current_date - 1
    where id = v_employee_b.id;

    insert into public.contents (
      slug, title, description, category, content_type, scope_type,
      scope_value, status, owner_id, current_version
    ) values
      (
        'demo-welcome', 'Welcome to Your First Week',
        'Synthetic sample content for validating the onboarding journey.',
        'demo', 'text', 'company', null, 'published', v_admin.id, 1
      ),
      (
        'demo-support-map', 'Finding the Right Support',
        'A fictional guide that contains no real contact details.',
        'demo', 'text', 'company', null, 'published', v_admin.id, 1
      ),
      (
        'demo-shift-readiness', 'Shift Readiness Practice',
        'A fictional checklist for exercising task completion flows.',
        'demo', 'task', 'company', null, 'published', v_admin.id, 1
      ),
      (
        'demo-knowledge-check', 'Sample Knowledge Check',
        'A fictional quiz prompt for exercising the onboarding content flow.',
        'demo', 'quiz_form', 'company', null, 'published', v_admin.id, 1
      ),
      (
        'demo-first-week-checkin', 'Demo First Week Check-in',
        'A fictional form for testing validated answers and private submissions.',
        'demo', 'quiz_form', 'company', null, 'published', v_admin.id, 1
      )
    on conflict (slug) do update set
      title = excluded.title,
      description = excluded.description,
      category = excluded.category,
      content_type = excluded.content_type,
      scope_type = excluded.scope_type,
      scope_value = excluded.scope_value,
      status = excluded.status,
      owner_id = excluded.owner_id,
      current_version = excluded.current_version;

    insert into public.content_versions (
      content_id, version_number, body, change_note, version_status,
      created_by, published_by, published_at
    )
    select
      c.id,
      1,
      case c.slug
        when 'demo-welcome' then '{"text":"Welcome to this fictional onboarding demo. Review the steps, then explore the sample support guide."}'::jsonb
        when 'demo-support-map' then '{"text":"Sample support directory: Team Alpha handles general questions; Team Beta handles schedule questions. These teams and details are fictional."}'::jsonb
        when 'demo-shift-readiness' then '{"instructions":"Review the sample readiness checklist, identify one question to ask your buddy, and confirm when you have finished."}'::jsonb
        when 'demo-knowledge-check' then '{"kind":"quiz","prompt":"Which action should you take when an instruction is unclear?","options":["Ask the assigned buddy or supervisor","Guess and continue","Skip the step"]}'::jsonb
        when 'demo-first-week-checkin' then '{"kind":"form","prompt":"Complete this fictional first-week check-in.","fields":[{"name":"buddy_question","label":"What question would you ask your onboarding buddy?","type":"text","required":true},{"name":"sample_team","label":"Choose a fictional support team","type":"choice","required":true,"options":["Team Alpha","Team Beta"]}]}'::jsonb
      end,
      'Initial synthetic demo version',
      'published',
      v_admin.id,
      v_admin.id,
      now()
    from public.contents c
    where c.slug in (
      'demo-welcome', 'demo-support-map', 'demo-shift-readiness',
      'demo-knowledge-check', 'demo-first-week-checkin'
    )
    on conflict (content_id, version_number) do update set
      body = excluded.body,
      change_note = excluded.change_note,
      version_status = excluded.version_status,
      published_by = excluded.published_by,
      published_at = excluded.published_at;

    insert into public.content_private_configs (
      content_id, version_number, answer_config
    )
    select c.id, 1, '{"answer_index":0,"passing_score":1}'::jsonb
    from public.contents c
    where c.slug = 'demo-knowledge-check'
    on conflict (content_id, version_number) do update set
      answer_config = excluded.answer_config;

    insert into public.templates (
      slug, name, description, scope_type, scope_value, status,
      version_number, created_by, published_by, published_at
    ) values (
      'demo-starter-journey',
      'Demo Starter Journey',
      'A fictional two-milestone onboarding journey for testing shared employee access.',
      'company', null, 'published', 1, v_admin.id, v_admin.id, now()
    )
    on conflict (slug) do update set
      name = excluded.name,
      description = excluded.description,
      scope_type = excluded.scope_type,
      scope_value = excluded.scope_value,
      status = 'published',
      version_number = 1,
      published_by = excluded.published_by,
      published_at = coalesce(public.templates.published_at, excluded.published_at);

    select * into v_template from public.templates
    where slug = 'demo-starter-journey';

    insert into public.milestones (
      template_id, name, sequence, available_offset_days, is_active
    ) values
      (v_template.id, 'Getting Started', 0, 0, true),
      (v_template.id, 'First Week', 1, 1, true)
    on conflict (template_id, sequence) do update set
      name = excluded.name,
      available_offset_days = excluded.available_offset_days,
      is_active = true;

    insert into public.template_items (
      milestone_id, content_id, sequence, is_required,
      available_offset_days, due_offset_days, completion_rule,
      include_in_progress, settings, is_active
    )
    select
      m.id, c.id, activity.sequence, activity.is_required,
      activity.available_offset_days, activity.due_offset_days,
      activity.completion_rule, true, '{}'::jsonb, true
    from (values
      ('Getting Started', 'demo-welcome', 0, true, 0, 3, 'content_acknowledgement'),
      ('Getting Started', 'demo-support-map', 1, false, 0, null, 'content_acknowledgement'),
      ('First Week', 'demo-shift-readiness', 0, true, 0, 5, 'manual_self_confirmation'),
      ('First Week', 'demo-knowledge-check', 1, true, 0, 5, 'quiz_pass_required'),
      ('First Week', 'demo-first-week-checkin', 2, true, 0, 5, 'form_submission')
    ) as activity(milestone_name, content_slug, sequence, is_required,
      available_offset_days, due_offset_days, completion_rule)
    join public.milestones m
      on m.template_id = v_template.id
      and m.name = activity.milestone_name
    join public.contents c on c.slug = activity.content_slug
    on conflict (milestone_id, sequence) do update set
      content_id = excluded.content_id,
      is_required = excluded.is_required,
      available_offset_days = excluded.available_offset_days,
      due_offset_days = excluded.due_offset_days,
      completion_rule = excluded.completion_rule,
      include_in_progress = excluded.include_in_progress,
      settings = excluded.settings,
      is_active = true;

    perform set_config('request.jwt.claim.sub', v_admin.id::text, false);
    perform public.assign_template_to_employee(
      v_template.id, v_employee_a.id, current_date - 1
    );
    perform public.assign_template_to_employee(
      v_template.id, v_employee_b.id, current_date - 1
    );
    perform set_config('request.jwt.claim.sub', '', false);
    raise notice 'Synthetic demo content, template, activities, employee profiles, and journeys are ready.';
  end if;
end
$seed$;
