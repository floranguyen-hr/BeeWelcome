# Bee Logistics Onboarding --- Master Specification

This master file is a concise entry point. For complete instructions,
use the full ZIP pack.

## Required reading

-   `AGENTS.md`
-   `skill.md`
-   `docs/PRODUCT_REQUIREMENTS.md`
-   `docs/TECHNICAL_ARCHITECTURE.md`
-   `docs/DATA_MODEL.md`
-   `docs/SECURITY_AND_PRIVACY.md`
-   `docs/PROGRESS_RULES.md`
-   `docs/CONTENT_AND_TEMPLATE_RULES.md`
-   `docs/IMPLEMENTATION_PLAN.md`
-   `docs/TEST_PLAN.md`
-   `docs/DECISIONS_AND_OPEN_QUESTIONS.md`

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

# Technical Architecture and Repository Structure

## 1. Technology decision

Inspect the existing codebase first and retain a viable existing
framework. For a new implementation, a TypeScript web app plus Supabase
(PostgreSQL, Auth, and RLS) is the preferred default, provided it fits
the existing deployment environment.

Do not assume free-tier limits or availability are permanent. Document
chosen provider, project setup, and any provider-specific limitations.
Use fake data only.

## 2. Architecture principles

-   Feature-oriented organization.
-   Clear separation of UI, application/use-case logic, domain rules,
    and infrastructure/data access.
-   Shared validation and type definitions.
-   Server-side authorization and database RLS.
-   Migrations and deterministic seed data.
-   Explicit dependency boundaries.
-   Small, focused components and services.
-   No database queries embedded directly in UI components.
-   Keep provider-specific logic isolated so the backend can be replaced
    or integrated with company systems later.

## 3. Suggested folder structure

Adapt this to the framework instead of forcing it into an incompatible
project.

``` text
/
├── AGENTS.md
├── skill.md
├── README.md
├── docs/
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── UX_AND_USER_FLOWS.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── SECURITY_AND_PRIVACY.md
│   ├── PROGRESS_RULES.md
│   ├── CONTENT_AND_TEMPLATE_RULES.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── TEST_PLAN.md
│   └── DECISIONS_AND_OPEN_QUESTIONS.md
├── src/
│   ├── app/ or routes/             # route composition only
│   ├── components/
│   │   ├── ui/                     # reusable primitives
│   │   └── layout/                 # app shells/navigation
│   ├── features/
│   │   ├── auth/
│   │   ├── employee-portal/
│   │   ├── admin-dashboard/
│   │   ├── content-library/
│   │   ├── template-builder/
│   │   ├── employee-management/
│   │   ├── journey-activities/
│   │   ├── resources/
│   │   ├── support-directory/
│   │   └── profile-feedback/
│   ├── domain/
│   │   ├── progress/
│   │   ├── permissions/
│   │   └── onboarding/
│   ├── services/                   # use cases/orchestration
│   ├── repositories/               # typed data-access interfaces/implementations
│   ├── lib/
│   │   ├── env/
│   │   ├── validation/
│   │   └── utils/
│   └── types/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml                 # if applicable
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
└── package.json
```

If the existing framework has a standard convention (for example,
app-router routes or colocated feature modules), follow that convention
while preserving separation of responsibilities. Do not create empty
folders merely to match this diagram.

## 4. Responsibility boundaries

-   **Routes/pages:** compose features and layouts; no complex business
    rules.
-   **UI components:** display state and emit user actions; no raw
    privileged database access.
-   **Feature modules:** screens and interactions for a product
    capability.
-   **Domain:** deterministic rules such as progress calculation, unlock
    logic, completion eligibility, and permission decisions.
-   **Services/use cases:** orchestrate workflows such as publish
    content, assign template, complete activity, apply template changes.
-   **Repositories/data access:** typed read/write operations; map
    database records to application models.
-   **Validation:** validate all external inputs and writes.
-   **Database:** constraints, foreign keys, indexes, RLS policies, and
    migrations.
-   **Tests:** verify domain rules, access boundaries, and end-to-end
    journeys.

## 5. Database access

-   Use migrations as the source of truth for schema changes.
-   Do not manually change production-like schema without a migration.
-   Use a server-only privileged client only when strictly necessary;
    never expose privileged keys to the browser.
-   Use authenticated user identity to determine data access, not
    client-supplied employee IDs alone.
-   Enforce RLS for any table reachable through the public client API.
-   Keep local and hosted configuration separate and document setup.

## 6. Authentication and role mapping

-   Use individual user accounts.
-   Maintain a controlled mapping between authenticated user ID and
    employee profile/role.
-   Never allow a user to set their own role or promote themselves
    through profile edits.
-   Provisioning/admin role changes must be restricted to trusted
    server-side operations or carefully controlled database procedures.
-   Use secure session handling supported by the chosen
    framework/provider.
-   Include a documented demo-account provisioning approach that does
    not commit passwords.

## 7. Environments

Use separate configuration for local development and hosted test
deployment. Keep secrets in the hosting/provider secret manager or local
untracked `.env` file. Commit `.env.example` with variable names and
safe placeholders only.

Potential variable names depend on framework but may include: -
`NEXT_PUBLIC_SUPABASE_URL` or equivalent public project URL. -
`NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable key only if the chosen
client SDK requires it. - `SUPABASE_SERVICE_ROLE_KEY` or equivalent
privileged secret --- server-side only, never public. - Any server auth
secret required by the chosen framework.

Codex must confirm exact names from the actual project and document
them. Never invent live credentials.

## 8. Error handling and observability

-   Present user-safe messages; keep technical detail in development
    logs only.
-   Never log secrets, session tokens, full private profiles, or quiz
    answers unnecessarily.
-   Add structured logging only where useful and safe.
-   Handle expired sessions, failed network requests, unavailable
    database, validation failures, and permission denial.
-   Do not silently swallow errors or fake successful persistence.

## 9. Extensibility

-   Keep the domain model independent from provider-specific UI where
    practical.
-   Avoid hardcoding Bee-specific names, contact details, departments,
    or policies in components.
-   Use configurable records for content, audiences, support contacts,
    and activity rules.
-   Keep external integrations behind interfaces/adapters for future
    HRP, Cloud, LMS, SSO, email, or internal-system integrations.

# Security and Privacy Requirements

## 1. Prototype safety boundary

-   Use synthetic/demo employee data only.
-   Do not upload real employee data, confidential policies, internal
    documents, real email lists, access tokens, or company secrets to
    third-party services without explicit company approval.
-   Do not describe the prototype as production-secure or legally
    compliant without formal review.
-   Document what provider stores the data, where the project is hosted
    if known, and who has access to the provider console.

## 2. Authentication

-   Individual accounts for HR Admin and employees.
-   Use a reputable authentication provider/framework integration.
-   Passwords must not be stored in application tables in plaintext.
-   Do not implement homemade password hashing/session handling when a
    suitable provider is available.
-   Protect authenticated routes and handle expired sessions.
-   Provision demo accounts through a documented safe process; do not
    commit passwords.

## 3. Authorization

-   Deny by default.
-   Employee can read only their own permitted profile, journey,
    activity, submissions, and relevant support/resources.
-   HR Admin can manage demo content/templates/assignments/progress
    within the prototype's explicitly defined scope.
-   User role cannot be changed through ordinary profile update
    requests.
-   Check authorization in server-side logic and database policies, not
    just UI conditions.
-   Test cross-account access attempts explicitly.

## 4. Supabase-specific guidance if selected

-   Enable Row Level Security (RLS) on every table accessible via the
    client API.
-   Write explicit policies for `SELECT`, `INSERT`, `UPDATE`, and
    `DELETE` as appropriate.
-   Avoid broad `USING (true)` / `WITH CHECK (true)` policies for
    private employee data.
-   Keep service-role keys and other privileged secrets server-side
    only.
-   Use the publishable/anon key only with RLS and policies configured
    correctly.
-   Restrict storage buckets for any uploaded files; do not make private
    files public by default.
-   Never disable RLS just to unblock development.
-   Test policies using at least two employee accounts and one HR Admin
    account.

## 5. Secrets and configuration

-   Commit `.env.example` only with placeholders.
-   Add real `.env` and provider credentials to `.gitignore`.
-   Never paste secrets into prompts, source files, issue trackers,
    public repositories, or browser code.
-   Do not log secrets, auth tokens, or sensitive payloads.
-   Rotate any secret that is accidentally exposed.

## 6. Content and file access

-   Check authorization before serving or linking private content.
-   Prefer controlled access to uploaded files where required.
-   Validate file types and size; use safe filenames and storage paths.
-   Do not execute uploaded content.
-   External links should be validated and opened safely.

## 7. Data minimization and retention

-   Collect only data required for the demo.
-   Prefer fake names, fake email addresses, and generic
    departments/positions.
-   Avoid sensitive employee details.
-   Provide archive/deactivation rather than destructive deletion where
    history is needed.
-   Document how demo data can be reset or removed.

## 8. Security acceptance criteria

-   Employee A cannot access Employee B's journey/profile/submissions by
    changing a URL, ID, or request payload.
-   Employee cannot create/promote their own HR Admin role.
-   Unauthenticated users cannot read private records.
-   HR-only actions are rejected by backend/database if called directly
    without permission.
-   No privileged key is present in browser bundle or repository.
-   RLS/policies and migration setup are documented.
-   Errors do not reveal secrets or unnecessary private information.
