# UX Structure and User Flows

## 1. Experience principles

-   Friendly, clear, professional, and easy for a new hire to navigate.
-   Make the next required action obvious.
-   Show future milestones without allowing early completion of locked
    tasks.
-   Avoid presenting progress as a performance rating.
-   Reuse one canonical content item instead of maintaining duplicate
    copies.
-   Provide visible success/error feedback and confirm destructive or
    broad-impact actions.

## 2. Employee portal

### Roadmap

-   Welcome message and basic employee context.
-   Progress summary with explanatory text about what is included.
-   Milestone timeline: Preboarding, D1, D7, D30, D60, D90.
-   Each milestone shows assigned activities, unlock state, due date,
    requirement, status, and linked content.
-   Activity detail view supports the relevant content type and
    completion action.
-   Offline tasks use a clear self-confirm button and timestamp.
-   Quiz/form submissions show validation and result/next-step messages.
-   Survey/feedback items can be assigned within the journey when
    intended to count; UX feedback from My Profile is separate.

### My Resources

-   Search by title/keyword.
-   Filter by category/type and, where useful, milestone.
-   Show only resources the employee is authorized to access.
-   Resources can be reopened even after a Roadmap activity is complete.
-   Opening a resource alone does not mark a separate activity complete
    unless configured.

### Support

-   Show configured contacts, role, name, office/team scope, and
    permitted contact methods.
-   Do not hardcode names or contacts from example scenarios.
-   If a contact is missing, show a useful empty state rather than
    fabricated information.

### My Profile

-   Display only the signed-in employee's permitted profile fields.
-   Allow UX feedback submission.
-   Explain that website feedback is not an onboarding activity and does
    not affect completion percentage.

## 3. Admin portal

### Dashboard

-   Summary counts for active demo journeys, overdue tasks, and
    progress.
-   Links to the workflows that need attention.
-   Do not expose employee details to unauthorized roles.

### Content Library

-   Search, filter, create, edit, preview, publish, and archive.
-   Show content type, scope, status, current version, owner, and where
    the content is used.
-   Warn before archiving content used by templates or active journeys.
-   Keep draft edits separate from published versions if practical for
    the chosen implementation.

### Template Builder

-   Create template and define audience/scope.
-   Create/reorder milestones and items.
-   Add existing content or create content inline.
-   Configure required/optional, availability, due date, completion
    rule, progress inclusion, and responsible contact/role.
-   Preview the template as an employee.
-   Publishing a template must not silently mutate existing journeys.
-   Provide an explicit action to apply structural changes to selected
    active journeys, with a summary of additions/removals before
    confirmation.

### Employee Management & Assignment

-   Create/update demo employees and assign a template.
-   Assigning a template creates a journey and its initial activity
    records.
-   Support employee-specific add/remove/override without changing the
    master template.
-   Warn if reassignment could affect progress/history; avoid
    destructive replacement.

### Activity & Progress Management

-   Filter by employee, milestone, status, and due date.
-   Inspect completion timestamp/source, quiz outcomes, and history.
-   Clearly distinguish employee self-confirmation from manager
    verification (manager verification is not part of the initial
    scope).

### Settings & Support Directory

-   Manage support contacts and their scope.
-   Configure supported activity types and default rules.
-   Provide safe defaults; avoid exposing secret configuration in UI.

## 4. Primary end-to-end flows

### Flow A --- create and assign onboarding

1.  HR Admin signs in.
2.  HR creates/publishes content.
3.  HR creates a template and arranges content/activity items into
    milestones.
4.  HR creates a demo employee or opens an existing one.
5.  HR assigns the template and confirms the journey.
6.  System creates activity instances with due/availability rules.
7.  Employee signs in and sees only their journey.

### Flow B --- complete activity

1.  Employee signs in.
2.  Employee opens an unlocked activity.
3.  Employee completes the configured action: quiz/form submission, task
    confirmation, or other supported completion action.
4.  System validates the action and records completion time/source.
5.  Progress is recalculated using the shared business rule.
6.  HR can see the updated status from their account.

### Flow C --- update content

1.  HR edits content and publishes a new version with a change note.
2.  Active references show the current published content.
3.  Existing completion is preserved by default.
4.  History records the version/change.
5.  If explicit reconfirmation is needed, HR must use a deliberate
    configured action.

### Flow D --- change template structure

1.  HR edits the template.
2.  Existing employee journeys remain unchanged by default.
3.  HR chooses whether to apply changes to selected journeys.
4.  System previews the planned changes.
5.  HR confirms.
6.  The system records an audit event and preserves completion/history
    wherever possible.

## 5. UI states

For all major screens, design: - Loading - Empty/no results - Validation
error - Network/server error - Permission denied - Success
confirmation - Locked/unavailable activity - Archived content or missing
dependency
