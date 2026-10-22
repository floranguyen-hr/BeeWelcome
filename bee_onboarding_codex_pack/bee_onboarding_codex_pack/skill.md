# Skill: Build and Maintain the Bee Logistics Onboarding Prototype

## Purpose

Guide Codex to implement a maintainable, configurable onboarding
application for a logistics company. The product must demonstrate a real
end-to-end workflow, use a shared cloud database, support individual
accounts, and remain structured for future extension by company IT.

## Required working method

1.  Read `AGENTS.md` and all relevant documents in `docs/`.
2.  Inspect the repository and report the framework, current routes,
    persistence mechanism, deployment configuration, and gaps against
    the specification.
3.  Before coding, propose a phased plan. Do not ask the user to make
    technical decisions that can safely be handled by a documented,
    reversible default.
4.  Build vertical slices end-to-end: schema/migration → data
    access/service → authorization → UI → tests/docs.
5.  After each slice, run tests, lint, type checking, and production
    build where available. Report exact commands and outcomes; never
    claim a check passed if it was not run.
6.  Update docs and `.env.example` when configuration changes.
7.  Keep the implementation focused on the pilot. Do not build
    speculative enterprise features.

## Product mental model

-   Content Library stores reusable content and its versions.
-   Template Builder arranges reusable content/activity items into
    milestones.
-   Employee Journey is a snapshot/instance assigned to one employee.
-   Journey Activities track each assigned activity, its availability,
    due date, status, and completion evidence.
-   Activity events provide an audit trail.
-   Shared resources can be accessed from both the Roadmap and My
    Resources; do not duplicate the canonical content.
-   Support contacts are configurable and may vary by
    office/department/position or employee.

## Core workflows to implement

### HR Admin

-   Sign in.
-   Create/edit/publish/archive reusable content.
-   Create and edit an onboarding template with milestones and ordered
    items.
-   Configure audience, availability, due dates, required/optional,
    completion rules, and whether each activity counts toward progress.
-   Create/update demo employee profiles.
-   Assign a template to an employee and generate their journey.
-   Add/remove employee-specific activities without changing the source
    template or other employees' journeys.
-   Inspect employee progress, overdue activities, quiz outcomes, and
    activity history.
-   Configure support contacts and global settings.

### Employee

-   Sign in to an individual account.
-   See only their assigned onboarding journey and permitted resources.
-   See future milestones, while locked activities remain unavailable
    until their unlock rule is met.
-   Open learning content, complete quizzes/forms, submit feedback, and
    self-confirm offline tasks.
-   See own progress and status.
-   Access support contacts and profile.
-   Submit website UX feedback that is separate from onboarding
    completion.

## Non-negotiable engineering practices

-   Prefer feature-oriented modules and clear separation of concerns.
-   Type data contracts and validate writes at system boundaries.
-   Keep UI components free of raw database queries.
-   Centralize access control and business rules.
-   Use migrations, seed scripts, and documented local setup.
-   Protect database tables with server-side authorization/RLS.
-   Never ship service-role credentials to the client.
-   Use fake data and safe placeholders only.
-   Keep business logic testable without rendering the UI.
-   Use stable identifiers, foreign keys, constraints, indexes where
    justified, and timestamps.
-   Avoid silent destructive operations. Archive content in use; show
    dependency warnings.
-   Preserve activity completion history when content is updated. Do not
    silently change existing journeys when a template's structure
    changes.

## Preferred default stack, subject to repository inspection

-   Use the framework already present if viable.
-   For a new project, prefer a mainstream TypeScript web framework
    already supported by the deployment target, typed forms/validation,
    and Supabase (PostgreSQL + Auth) for shared cloud persistence.
-   Use Supabase migrations and Row Level Security policies.
-   If a different stack is better due to the existing codebase, explain
    trade-offs before changing direction.
-   Do not assume any free-tier quota or provider terms are permanent;
    document the selected provider and current configuration without
    promising ongoing free service.

## Output expectations

At each milestone, report: - What was implemented. - Main files
added/changed and their responsibilities. - Database
migration/configuration steps. - Environment variables needed (names
only; never request secrets in chat). - Tests/builds run and exact
outcomes. - Known limitations and next step.
