# Content Library and Template Rules

## 1. Content Library

Content is reusable and independently managed. HR can create it in the
Content Library or create it inline from Template Builder.

### Supported initial types

-   Text/rich text
-   Image
-   Video or video URL
-   File/external link
-   Task
-   Quiz/form/survey

### Common metadata

-   Title, description, category/type
-   Audience scope: company, office, department, position, group, or
    individual
-   Owner, status, version, creation/update/publish timestamps
-   Dependency/use list where practical

### Lifecycle

-   Draft: editable, not visible to employees by default.
-   Published: available according to access/scope rules.
-   Archived: no longer selectable for new use by default, but history
    and existing references are preserved as defined by HR.
-   Do not permanently delete content in use. Warn about references
    before archiving.

## 2. Versioning

-   Each published content update creates a new version or immutable
    published snapshot.
-   Store a change note, author, and publication time.
-   Current references render the latest published version by default.
-   Existing completion is preserved by default when content changes.
-   For mandatory policy updates, HR may later invoke an explicit
    re-read/reconfirmation requirement.
-   Keep sufficient history to understand what changed; do not claim
    full immutable audit if not implemented.

## 3. Template structure

`Template → Milestone → Template Item`

-   Typical milestones: Preboarding, D1, D7, D30, D60, D90.
-   Each template item references reusable content and configures its
    use in the journey.
-   HR can add/reorder/remove items, set audience scope,
    required/optional, availability, due date, completion rule, progress
    inclusion, and responsible role/contact where supported.
-   Allow previewing a template from the employee perspective.
-   Validate that each item has a usable content reference and supported
    completion rule.

## 4. Audience and personalization

-   Content may be company-wide or scoped to office, department,
    position, group, or employee.
-   A template may mix shared and role-specific content.
-   Pilot may use one complete template per audience; do not hardcode
    specific departments/positions as application logic.
-   Assignment should check compatibility between employee audience and
    template/content scope.
-   Employee-specific additions/removals affect only that employee's
    journey.

## 5. Assignment snapshots

When assigning a template: - Create an `employee_journey`. - Create one
`journey_activity` per applicable template item. - Copy or resolve
relevant settings: milestone, due/availability dates, required flag,
completion rule, progress inclusion. - Keep a reference to source
template item where applicable. - Store minimal snapshot fields
necessary for history and to protect against unintended structural
changes. - Use a transaction or equivalent atomic operation to avoid
partially assigned journeys.

## 6. Change propagation

### Content edit

-   A published content update propagates to active references of that
    content by default.
-   Does not reset completion.
-   Records version/change history.

### Template structural edit

-   Does not automatically add/remove/reorder activities in existing
    journeys.
-   HR must explicitly select active journeys and apply changes.
-   Before confirmation, show planned additions/removals and possible
    effects.
-   Preserve completion/history when possible; do not delete evidence.
-   Record who applied changes, when, and to which journeys.

## 7. Removing activities

-   Prefer marking an activity as removed/cancelled over hard deletion.
-   Exclude removed activities from progress denominator.
-   Preserve audit/history and explain removal to HR.
-   Removing an item from a template affects future assignments by
    default, not existing journeys.
