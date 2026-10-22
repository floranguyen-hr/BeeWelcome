# Data Model (Initial Proposal)

This is a conceptual model. Codex must adapt names and constraints to
the actual framework/database, then implement via migrations. Avoid
denormalizing without a documented reason.

## 1. Identity and employee profiles

### `profiles`

-   `id` --- primary key matching authenticated user ID where practical.
-   `employee_code` --- optional fake/demo identifier; unique if
    present.
-   `display_name`
-   `email`
-   `role` --- controlled enum/value such as `hr_admin`, `employee`; not
    user-editable.
-   `office_id`, `department_id`, `position_id` --- nullable
    references/configurable values.
-   `start_date`
-   `is_active`
-   `created_at`, `updated_at`

Only the account owner and authorized HR Admin may read relevant profile
fields. Employee role must never be self-assigned.

### Optional audience dimensions

`offices`, `departments`, `positions` may be normalized lookup tables or
managed through a validated configuration table. Choose based on actual
scope; avoid unnecessary complexity for the pilot.

## 2. Content and versions

### `contents`

-   `id`
-   `title`
-   `content_type` --- `text`, `image`, `video`, `file_link`, `task`,
    `quiz_form`
-   `category`
-   `description`
-   `scope_type` --- `company`, `office`, `department`, `position`,
    `group`, `employee`
-   `scope_id` or normalized audience mapping
-   `status` --- `draft`, `published`, `archived`
-   `current_version_id`
-   `owner_id`
-   timestamps

### `content_versions`

-   `id`
-   `content_id`
-   `version_number`
-   structured `body` or validated content payload
-   optional asset/link metadata
-   `change_note`
-   `published_at`, `published_by`
-   `created_at`

Keep version history. Ensure a published version cannot be silently
rewritten in place if immutable versioning is adopted.

## 3. Templates and milestones

### `templates`

-   `id`
-   `name`, `description`
-   audience/scope definition
-   `status` --- `draft`, `published`, `archived`
-   `version_number` or version relation
-   `created_by`, `published_by`
-   timestamps

### `milestones`

-   `id`
-   `template_id`
-   `name` --- typical milestones: Preboarding, D1, D7, D30, D60, D90
-   `sequence`
-   relative timing/opening rule
-   timestamps

### `template_items`

-   `id`
-   `milestone_id`
-   `content_id`
-   `sequence`
-   `is_required`
-   `available_offset_days` or explicit unlock rule
-   `due_offset_days` (nullable)
-   `completion_rule`
-   `include_in_progress`
-   responsible role/contact reference (optional)
-   timestamps

Use stable IDs and explicit sequence ordering. Avoid assuming that a
milestone label always equals a fixed calendar date.

## 4. Journeys and activity instances

### `employee_journeys`

-   `id`
-   `employee_id`
-   `template_id`
-   assigned template version/snapshot metadata
-   `start_date`
-   `status` --- `active`, `completed`, `cancelled`
-   `assigned_by`, `assigned_at`
-   timestamps

### `journey_activities`

-   `id`
-   `journey_id`
-   `template_item_id` nullable for employee-specific activities
-   `content_id`
-   milestone reference or snapshot
-   content/version reference as needed for history
-   `title_snapshot` or other minimal snapshot fields where required for
    audit
-   `available_at`, `due_at`
-   `is_required`
-   `include_in_progress`
-   `completion_rule`
-   `status`
-   `completed_at`
-   `completion_source` --- e.g. `quiz_pass`, `form_submission`,
    `employee_self_confirmation`, `admin_action` only if permitted
-   `is_removed` / cancellation metadata
-   `created_at`, `updated_at`

A journey activity is an instance assigned to one employee; it must not
be treated as the template item itself.

## 5. Quiz/form submissions

Use a dedicated submission table or a validated structured payload
depending on scope: - `id` - `journey_activity_id` - `employee_id` -
answer payload with strict access controls - score/pass status when
applicable - submitted timestamp

Never expose another employee's answers. Validate payload shape and
scoring server-side. Do not place real personal/sensitive information in
demo submissions.

## 6. Support directory

### `support_contacts`

-   `id`
-   `display_name`
-   `support_role`
-   permitted contact methods (only demo-safe details)
-   audience scope (office/department/position/group/employee)
-   `is_active`
-   timestamps

Use demo names and placeholder contact details. Do not hardcode actual
contacts from example scenarios.

## 7. Website UX feedback

### `ux_feedback`

-   `id`
-   `employee_id`
-   rating/category/comment as appropriate
-   `submitted_at`
-   `status` if admin review is required

This is not an onboarding activity and must not affect progress.

## 8. Audit history

### `activity_events`

-   `id`
-   `actor_user_id`
-   `journey_activity_id` nullable
-   `content_id` nullable
-   `template_id` nullable
-   `event_type`
-   safe structured `change_summary`
-   `created_at`

Record important events: content published/archived, template published,
journey assigned, activity completed, activity removed, template changes
applied to journeys, role changes. Avoid logging secrets or unnecessary
private content.

## 9. Relationship summary

-   One content item has many content versions.
-   One template has many milestones.
-   One milestone has many template items.
-   A content item may be reused by many template items.
-   One employee may have journeys over time.
-   One journey has many journey activities.
-   A journey activity can reference a template item or be
    employee-specific.
-   One activity can have submissions and audit events.
-   Support contacts are filtered by audience scope.
-   UX feedback belongs to an employee but is separate from journey
    completion.

## 10. Data integrity

-   Use foreign keys, unique constraints, not-null constraints, and
    indexes where justified.
-   Use transactions for workflows that create a journey and multiple
    activity instances.
-   Avoid hard delete for records referenced by journeys/history.
-   Keep status values controlled and validated.
-   Store timestamps consistently; display them in the user's relevant
    local timezone.
-   Ensure progress calculation is derived from the canonical activity
    records and documented rules.
