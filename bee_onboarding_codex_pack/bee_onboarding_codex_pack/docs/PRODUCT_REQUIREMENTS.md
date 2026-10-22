# Product Requirements Document (PRD)

## 1. Product summary

Build a working prototype of an onboarding web application for Bee
Logistics. HR can manage reusable content, templates, employee
assignments, and progress. Each employee signs in with an individual
account and sees their own personalized onboarding journey. Data
persists in a shared cloud database and can be accessed from different
computers.

This prototype is intended to validate the HR workflow and communicate
requirements to company IT. It is not approved for real employee data or
production use until the company reviews security, privacy, access
control, operations, and integration requirements.

## 2. Goals

-   Demonstrate a working end-to-end onboarding workflow.
-   Allow HR to create and reuse content.
-   Build templates with milestones and activity rules.
-   Assign a template to an employee and personalize that employee's
    journey.
-   Let employees complete online and offline activities.
-   Track progress, due dates, statuses, and activity history.
-   Support separate logins and server/database-enforced authorization.
-   Use a shared cloud database; prioritize a free/low-cost test tier.
-   Keep the codebase modular, documented, testable, and extensible.

## 3. Out of scope for the initial prototype

-   Production-grade deployment for real employee data.
-   Integration with Bee Logistics SSO, HRP, Cloud, LMS, email, or other
    internal systems.
-   Sending real welcome emails automatically.
-   Real employee personal data, sensitive policies, or confidential
    internal documents.
-   Full competency assessment, probation evaluation, payroll,
    performance management, or KPI scoring.
-   Complex workflow approvals, analytics warehouse, multi-company
    tenancy, or native mobile apps.
-   Claiming legal/privacy compliance without review.

## 4. Roles

### HR Admin

-   Manage content, templates, demo employees, assignments, support
    directory, settings, and progress.
-   View journeys and progress for employees within the permitted demo
    scope.
-   Apply explicit template changes to existing journeys only after
    confirmation.

### Employee

-   View their own profile, assigned journey, permitted resources, and
    support contacts.
-   Complete assigned activities and view their own progress.
-   Cannot access other employees' private profiles, journeys, quiz
    answers, or activity history.

### Future roles

Manager, Buddy, HR Site/HRBP, L&D, IT/Helpdesk, and other support roles
may be added later. Do not imply these roles have permissions unless
implemented and tested.

## 5. Employee Portal navigation

1.  **Roadmap**
    -   Welcome area and employee context.
    -   Overall onboarding progress.
    -   Milestones: Preboarding, Day 1, Day 7, Day 30, Day 60, Day 90.
    -   Activity cards, unlock state, due dates, completion status, and
        linked resources.
    -   Quizzes, forms, surveys, feedback, and offline task
        self-confirmation.
2.  **My Resources**
    -   Searchable/filterable library for permitted policies, guides,
        travel-expense guidance, HRP/Training/OF1/Cloud resources,
        SOP/process documents, job descriptions, probation scorecards,
        and similar resources.
    -   Actual content is configurable by HR; examples above are
        categories, not hardcoded company facts.
    -   Resources are canonically stored in Content Library and can be
        linked from Roadmap.
3.  **Support**
    -   Manager, Buddy, HRBP/HR Site, IT/Helpdesk, and other configured
        contacts.
    -   Display only contacts relevant to the employee's
        office/department/position or individual assignment.
4.  **My Profile**
    -   Employee profile information permitted to the signed-in user.
    -   Website UX feedback. This feedback is separate from onboarding
        activities and does not affect onboarding progress.

## 6. Admin Portal navigation

-   Dashboard: active journeys, aggregate progress, overdue activities,
    content needing attention.
-   Content Library: create, edit, classify, publish, archive, version,
    and reuse content.
-   Template Builder: create/edit templates, milestones, ordered items,
    audience, unlock/due/completion rules.
-   Employee Management & Assignment: manage demo profiles, assign
    templates, and customize individual journeys.
-   Activity & Progress Management: view statuses, overdue work, quiz
    outcomes, completion evidence, and history.
-   Settings & Support Directory: support contacts, activity types,
    completion rules, access rules, and shared settings.

The UI may combine modules when appropriate, but responsibilities and
permissions must remain clear.

## 7. Content types

Initial configurable types: - Text / rich text - Image - Video or video
link - File / external link - Task (online or offline) - Quiz / form /
survey

Task and Quiz/Form require their own configuration, not just an attached
file. For quizzes, support a configurable completion rule: -
`pass_required`: submission alone is not completion; employee must meet
the configured pass criteria. - `participation_only`: valid submission
counts as completed.

## 8. Personalization and assignment

-   Journey content can vary by Office, Department, Position, group, or
    individual employee.
-   HR may create content in Content Library or create a new content
    item inline from Template Builder.
-   A template may combine company-wide content with scoped or
    role-specific items.
-   A fully assembled template per audience is acceptable for the pilot,
    while content remains reusable.
-   Employee-specific additions/removals must not modify the master
    template or another employee's journey.
-   Future milestones may be visible, but locked activities cannot be
    completed before their availability rule permits it.

## 9. Activity behavior

-   Online content is not automatically complete merely because it was
    opened, unless an explicit activity rule says so.
-   Offline task completion is self-confirmed by the employee in the
    prototype; store timestamp and completion source as employee
    self-confirmation. Do not label it manager-verified.
-   An activity can be required or optional and may or may not count
    toward progress.
-   Removing/canceling an assigned activity excludes it from the
    progress denominator, while retaining history where appropriate.
-   Provide statuses such as Locked, Not started, In progress,
    Completed, Overdue. Use Pending confirmation only if an actual
    review workflow is implemented.
-   UX feedback in My Profile and general resource browsing do not count
    as onboarding completion by default.

## 10. Content and template updates

-   Published content edits propagate to all active references of that
    content, without resetting completion by default.
-   Keep content version history and change notes.
-   For sensitive/compliance content, allow a future/configurable
    explicit rule requiring re-read or reconfirmation; do not reset all
    completions automatically.
-   Template structural changes do not silently add/remove items in
    existing journeys.
-   HR must explicitly choose whether to apply structural changes to
    existing journeys.
-   Record who made important changes and when.
-   Do not permanently delete content that is in use; archive it and
    warn about dependencies.

## 11. Progress

-   Display one overall percentage for the employee journey.
-   The denominator contains assigned, eligible activities whose
    availability time has arrived. Future locked activities are excluded
    until they become eligible.
-   Only activities assigned to the employee and configured to count
    toward progress are included.
-   Completed eligible activities count as complete. Removed/canceled
    activities are excluded.
-   Example: if 7 eligible activities exist and all 7 are completed,
    progress is 100%; as more activities unlock, the denominator can
    increase and the percentage can change.
-   Equal weight per eligible activity is the initial default unless
    later explicitly configured otherwise.
-   Do not equate progress with competency, performance, or probation
    success.

## 12. Non-functional requirements

-   Responsive for desktop and mobile browsers.
-   Accessible labels, keyboard focus, clear feedback, and readable
    layouts.
-   Search/filter, empty/loading/error states, and validation for key
    admin workflows.
-   Database schema and migrations tracked in version control.
-   Seeded demo data and repeatable setup instructions.
-   Authorization enforced server-side and/or with database RLS.
-   Clear environment configuration; secrets never committed.
-   Testable business logic and automated tests for core calculations
    and access boundaries.
-   Maintainable, feature-oriented file structure.
