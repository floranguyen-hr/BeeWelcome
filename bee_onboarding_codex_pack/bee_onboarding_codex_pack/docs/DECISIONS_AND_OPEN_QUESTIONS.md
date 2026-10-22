# Decisions and Open Questions

## 1. Decisions already made

-   Product is a working prototype, not a static mockup.
-   Individual account per user.
-   Shared cloud database, accessible across devices.
-   Prefer free/low-cost tier for test; no dedicated server purchase
    required by default.
-   Use fake/demo data only until company approval.
-   Employee portal: Roadmap, My Resources, Support, My Profile.
-   Admin portal: Dashboard, Content Library, Template Builder, Employee
    Management & Assignment, Activity & Progress Management, Settings &
    Support Directory.
-   Content can be created in Content Library or inline in Template
    Builder.
-   One complete template per audience is acceptable for pilot; content
    may be shared or role-scoped.
-   Published content updates propagate to active uses by default and do
    not reset completion.
-   Template structural changes do not silently modify existing
    journeys; HR explicitly applies changes to selected journeys.
-   Progress denominator includes eligible assigned activities unlocked
    by the current time; future locked activities are excluded.
-   Removed/canceled activities are excluded from progress while history
    is preserved.
-   Equal weight per eligible activity is the default.
-   Offline task completion is employee self-confirmation, not manager
    verification.
-   Opening a resource alone does not complete an activity by default.
-   My Profile UX feedback is separate from onboarding progress.
-   Progress is not competency/KPI/probation performance.

## 2. Recommended defaults to implement unless repository constraints require a change

-   Supabase for shared PostgreSQL database and authentication, subject
    to codebase inspection.
-   TypeScript and feature-oriented architecture.
-   RLS on all client-accessible private tables.
-   Draft/published/archived content lifecycle with version history.
-   Migrations and synthetic seed data.
-   Use a transaction for assigning templates and creating activity
    instances.
-   Use timestamps and explicit completion sources.
-   Store resolved availability/due dates on activity instances so
    template edits do not silently change active deadlines.

## 3. Decisions to keep configurable

-   Exact employee attributes and audience dimensions.
-   Exact content for Company Story, Direction, Core Values, policies,
    role-specific SOPs, and training materials.
-   Support contacts and contact methods.
-   Activity types and completion criteria.
-   Whether a specific mandatory policy change requires
    re-acknowledgement.
-   Whether future activity weighting beyond equal weight is needed.
-   Exact hosting provider and deployment domain.

## 4. Open questions not to block the initial scaffold

-   Which framework and deployment provider already exist in the current
    repository?
-   Does the HRD need to create demo accounts himself, or will the
    developer provision them?
-   Does the pilot need file uploads, or are links/seeded sample content
    enough for the first release?
-   Which exact fields should be included in the employee profile?
-   Should managers/Buddies later receive a limited view? Not in initial
    scope unless explicitly requested.
-   Does the prototype need email delivery, or is displaying a demo
    welcome link sufficient? Real email sending is out of scope
    initially.

## 5. Handling uncertainty

Codex should choose the simplest secure, reversible default for
non-blocking decisions, document the assumption, and continue. Ask the
user only when the choice materially changes product behavior, cost,
privacy, or data integrity.
