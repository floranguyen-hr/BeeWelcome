# Implementation Plan

Codex should inspect the repository and adapt this sequence to the
current project. Do not attempt a large unverified rewrite.

## Phase 0 --- Repository assessment

-   Identify framework, package manager, routes, current data
    persistence, deployment setup, existing UI, and tests.
-   Map existing files to the proposed architecture.
-   Report gaps and implementation plan.
-   Do not overwrite or discard existing work without justification.

Acceptance: clear architecture summary and phased file-change plan.

## Phase 1 --- Foundation and environment

-   Establish/retain TypeScript and lint/type-check/build setup as
    appropriate.
-   Create documented environment configuration and `.env.example`.
-   Set up provider client safely.
-   Add database migrations and synthetic seed data.
-   Define domain types, validation, repository boundaries, and
    auth/role model.

Acceptance: app builds; schema can be recreated from migrations; no
secrets committed.

## Phase 2 --- Authentication and authorization

-   Individual sign-in.
-   HR Admin vs Employee role resolution.
-   Protected route/layout handling.
-   Database/server authorization and RLS policies.
-   Demo account setup instructions.

Acceptance: anonymous users cannot access private data; employees cannot
access each other's records; employees cannot self-promote.

## Phase 3 --- Content Library

-   List/search/filter.
-   Create/edit/publish/archive supported content.
-   Version history/change note.
-   Content dependency warning.
-   Inline content creation can be added with Template Builder
    integration later.

Acceptance: published content persists and is visible only to eligible
audiences.

## Phase 4 --- Template Builder

-   Create/edit templates and milestones.
-   Add/reorder content/activity items.
-   Configure availability, due date, required/optional, completion
    rule, progress inclusion.
-   Preview as employee.
-   Publish without mutating active journeys.

Acceptance: a valid template can be published and reused.

## Phase 5 --- Employee management and assignment

-   Create/update synthetic employee profiles.
-   Assign template transactionally.
-   Generate per-employee activity instances and resolved dates.
-   Add/remove employee-specific activities without mutating template.

Acceptance: employee receives correct assigned activities;
reassignment/change handling preserves history.

## Phase 6 --- Employee portal

-   Roadmap and milestone timeline.
-   My Resources.
-   Support.
-   My Profile and separate UX feedback.
-   Activity detail/completion for supported types.
-   Locked/empty/error states.

Acceptance: employee can complete the intended demo journey from their
own account.

## Phase 7 --- Progress and admin tracking

-   Central progress calculation.
-   Activity statuses and due-date behavior.
-   Admin filters and employee progress detail.
-   Audit history for key actions.

Acceptance: progress matches test cases and updates across
accounts/devices.

## Phase 8 --- Hardening and deployment

-   Unit/integration/e2e tests for core paths and authorization.
-   Responsive/accessibility pass.
-   Production build and deployment smoke test.
-   Verify no secrets in browser bundle or repository.
-   Document limitations, provider settings, and data reset procedure.

Acceptance: test checklist passes; limitations are explicitly
documented.

## Implementation reporting

At each phase, report files changed, schema changes, environment
variables, commands run, results, and remaining blockers.
