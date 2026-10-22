# Repository Instructions for Codex

## Mandatory first steps

1.  Read this file, `skill.md`, and every relevant file under `docs/`.
2.  Inspect the existing repository, package manager, framework, routes,
    environment setup, and deployment target before changing anything.
3.  Summarize the existing architecture and propose a phased
    implementation plan with files/modules to create or change.
4.  Preserve working behavior unless a change is required by the
    specification. Do not replace the entire app without explaining why.
5.  Implement in small, verifiable steps. Run available lint,
    type-check, tests, and build commands after meaningful changes.

## Architecture and maintainability

-   Use a clear feature-oriented structure with separation of UI,
    application/business logic, data access, validation/types, and
    infrastructure.
-   Keep components small and focused. Avoid giant page components,
    duplicated business rules, and monolithic files.
-   Keep shared types and validation schemas in reusable modules. Do not
    duplicate enums or permission logic across screens.
-   Keep database access out of presentation components. Use typed
    repositories/services or a similarly clear data-access boundary.
-   Keep secrets server-side only. Never expose service-role/admin
    database keys in browser bundles, client-side environment variables,
    source control, screenshots, or logs.
-   Use environment variables for configuration; commit only
    `.env.example` with placeholder values.
-   Add database migrations/schema definitions and document how to apply
    them.
-   Use deterministic seed/demo data that contains no real employee
    information.
-   Add loading, empty, error, and unauthorized states to important
    screens.
-   Make the UI responsive and accessible; use semantic controls,
    labels, keyboard navigation, and visible focus states.
-   Do not introduce dependencies without explaining why they are
    needed.
-   Avoid premature abstraction, but create clean module boundaries that
    allow replacing the prototype backend or integrating with company
    systems later.

## Security requirements

-   Treat all browser input as untrusted.
-   Enforce authorization on the server/database, not only by hiding UI
    elements.
-   Apply least privilege and deny-by-default access.
-   Employees may only read/update their own permitted profile and
    assigned journey/activity records. HR Admin capabilities must be
    explicitly checked.
-   If using Supabase, enable Row Level Security on all tables exposed
    through the API and create explicit policies. Never rely on the
    publishable/anon key alone as authorization.
-   Never disable RLS to make a feature work.
-   Never place secrets, passwords, access tokens, or real employee
    records in committed files.
-   Do not log sensitive data.
-   If any required security control cannot be implemented, clearly
    label it as a blocker; do not claim the app is secure.

## Product rules

-   Follow `docs/PRODUCT_REQUIREMENTS.md`, `docs/PROGRESS_RULES.md`,
    `docs/CONTENT_AND_TEMPLATE_RULES.md`, and
    `docs/SECURITY_AND_PRIVACY.md`.
-   Employee portal top-level navigation: Roadmap, My Resources,
    Support, My Profile.
-   Admin portal modules: Dashboard, Content Library, Template Builder,
    Employee Management & Assignment, Activity & Progress Management,
    Settings & Support Directory.
-   Content changes and template structure changes are separate
    operations. Published content updates can propagate to active uses
    without resetting completion; template structure changes do not
    silently mutate existing journeys.
-   Progress is not a measure of employee competency or probation
    performance.
-   Use fake/demo data only in this prototype.

## Definition of done for each feature

-   Function works end-to-end, including persistence when relevant.
-   Permissions are enforced and tested.
-   Validation and failure states are handled.
-   Tests or a clear manual test checklist are added/updated.
-   Documentation is updated if behavior, schema, environment variables,
    or setup changes.
-   No secrets or real personal data are committed.
