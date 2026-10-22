# Progress, Unlocking, and Completion Rules

## 1. Canonical source

Progress is calculated from the employee's assigned
`journey_activities`, not directly from the template. Template items
define defaults; journey activities represent what a specific employee
has actually been assigned.

## 2. Eligible activity

An activity is eligible for the denominator when all are true: - It
belongs to the signed-in employee's active journey. - It is not
removed/cancelled. - `include_in_progress` is true. - Its availability
time has arrived. - It is a valid assigned onboarding activity.

Future locked activities are excluded until they become available.
Resource browsing, Support, My Profile, and general UX feedback are
excluded unless an explicit activity was separately assigned.

## 3. Formula

Default equal-weight formula:

`progress_percent = completed_eligible_activity_count / eligible_activity_count * 100`

-   If denominator is zero, display a neutral state such as "Chưa có
    hoạt động được mở khóa" rather than divide by zero or show a
    misleading 100%.
-   Round for display only; retain precise values internally if needed.
-   A completed activity is counted once.
-   Removed activities are excluded from numerator and denominator.
-   As new activities unlock, denominator may increase and percentage
    may change.
-   Do not interpret this percentage as competency, performance, or
    probation outcome.

## 4. Completion rules

-   `manual_self_confirmation`: employee explicitly confirms an offline
    task; record timestamp and source as employee self-confirmation.
-   `form_submission`: valid form submission completes the activity if
    configured.
-   `quiz_participation`: valid submission completes the activity
    regardless of score if configured as participation-only.
-   `quiz_pass_required`: completion requires the configured pass
    threshold; submission alone does not count as complete.
-   `content_acknowledgement`: if supported, employee must explicitly
    acknowledge; merely opening the content is not enough.
-   `admin_completion`: only if intentionally enabled and authorized;
    record actor and reason. Do not imply manager verification unless
    that workflow exists.

Validate completion on the server/database boundary where feasible. A
client must not be able to mark a locked activity complete by sending an
arbitrary status.

## 5. Statuses

-   `locked`: availability time has not arrived.
-   `not_started`: available but no meaningful activity started.
-   `in_progress`: activity has been started but not completed.
-   `completed`: completion rule has been satisfied.
-   `overdue`: not completed and due date has passed.
-   `removed`: cancelled/removed from active assignment; exclude from
    progress while retaining history.

Overdue may be derived from due date and current status instead of
stored redundantly. Choose one canonical approach and document it. Do
not use `pending_confirmation` unless an actual confirmation workflow is
implemented.

## 6. Due dates

-   Template due dates are relative to the employee's journey start date
    unless explicitly modeled otherwise.
-   Persist resolved `available_at` and `due_at` on the journey activity
    at assignment time, so later template edits do not silently alter
    active deadlines.
-   If a journey start date changes, require an explicit operation to
    recalculate dates and explain effects.

## 7. History and content updates

-   Editing/publishing new content does not reset completion by default.
-   If policy requires re-acknowledgement, implement an explicit
    operation and record an event.
-   Preserve completed timestamps and completion source.
