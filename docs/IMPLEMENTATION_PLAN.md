# Implementation Plan

## Accepted baseline

Start from the empty Web Code workspace with Next.js App Router, TypeScript, Supabase Auth, and Supabase PostgreSQL. Use the framework convention for route composition and feature modules for the onboarding capabilities. Recheck the hosting environment before choosing the final deployment service.

Use synthetic data only. Never put passwords, API secret keys, or real employee records in source control. Keep the publishable key in browser configuration and privileged Supabase credentials in a trusted server/admin workflow only.

## Phase 1 — Foundation and authentication — implemented locally

### Files and responsibilities

- package.json, package-lock.json, tsconfig.json, next.config.ts, eslint.config.mjs: app scripts and build/tool configuration.
- app routes and src/app layouts: public landing page, sign-in, protected employee and admin shells, access-denied and error states.
- src/features/auth: login interaction, validated input, server session/profile lookup, and role checks.
- src/lib/supabase: browser and server clients plus cookie refresh proxy.
- supabase/migrations: profiles table, role constraints, timestamp trigger, HR Admin helper, and profile RLS.
- scripts/provision-demo-accounts.ps1: secure first-admin, HRD, and employee demo account provisioning.
- scripts/check-hosted-rls.ps1: checks hosted access with two employee logins and one HR Admin login.
- supabase/tests: policy tests against a PostgreSQL-compatible engine using two employee fixtures and two admin fixtures.
- .env.example and README.md: setup, local checks, secret handling, account provisioning, and deployment steps.

### Identity and access model

Supabase Auth owns passwords and individual identities. Profiles are keyed by the Auth user ID. Supported app roles are hr_admin and employee. The demo HRD has a separate login and uses hr_admin permissions because the product requirements define no distinct HRD permission set.

Public sign-up is disabled. The trusted PowerShell provisioning path uses a hidden key prompt and creates users through Supabase Auth Admin. It never stores passwords in repository files. Authenticated clients can read their own profile; HR Admin can read profiles in the prototype scope. Clients receive no profile write grant, so a user cannot promote themselves through a profile update.

### Acceptance checks

- TypeScript, lint, unit tests, database RLS tests, and production build pass locally.
- The database fixture proves Employee A and Employee B cannot read one another, employees cannot promote their own role, and an HR Admin can read the demo profiles.
- The configured Supabase Auth health endpoint returned HTTP 200. An anonymous filtered profile request returned HTTP 401, but its error body was unavailable, so this does not establish that the migrations or RLS policies are applied. The hosted access script must still pass with two employee accounts and one HR Admin account; hosted migrations and demo account state are not verified.

## Phase 2 — Content Library and Template Builder — implemented and locally tested

Add migrations for contents, content versions, templates, milestones, and template items. Add feature modules under src/features/content-library and src/features/template-builder; repositories, validation, and use cases keep SQL and rules outside UI components.

Support draft, published, archived, scoped content and version history. Configure ordered milestones and activity rules. Publishing new content preserves completion. Template structure edits affect future assignments unless HR explicitly applies a reviewed change to selected active journeys.

Implementation status: migration `202610220002_content_templates.sql` creates scoped content, content versions, templates, milestones, activity rules, RLS policies, and HR Admin-only RPCs. Admin routes provide content draft/publish/archive and template draft/edit/order/remove/publish/archive workflows. PGlite tests execute the real migrations and verify employee isolation, management RPCs, and template authoring/order/versioning. Journey assignments and immutable snapshots are covered in Phase 3.

Local acceptance: the consolidated suite currently passes 24 database/RLS tests, plus typecheck, lint, production build, and unauthenticated route smoke checks. A project URL and publishable key are configured locally, but hosted migrations, cross-account authorization, and deployment remain unverified.

## Phase 3 — Synthetic seed data and employee assignment — implemented and locally tested

Add idempotent synthetic content, one or more templates, milestones, activities, two employee profiles, and assigned journeys. Add employee_journeys, journey_activities, and activity_events migrations. The same seed must be safe to rerun without duplicate records.

Migration 202610220003_employee_journeys.sql adds employee journeys, immutable activity snapshots, assignment audit events, employee/admin RLS policies, and the HR Admin-only assignment RPC. Assignment validates the employee and content audience, snapshots published content and scheduling rules in one transaction, and is idempotent for an employee/template version. The Roadmap reads assigned snapshots through employee-scoped RLS; completion interactions are implemented in Phase 4.

supabase/seed.sql is repeatable and uses only fictional .invalid demo accounts, synthetic profile attributes, five demo content items (including a protected quiz and a form), one template, two milestones, five activities, and two employee journeys. scripts/seed-demo-data.ps1 runs the seed on local or linked Supabase after identities exist. PGlite executes the migration and seed twice; tests verify employee isolation, HR Admin visibility, assignment audience checks, immutable snapshots, and stable record counts. Auth health is reachable through the locally configured URL, but hosted schema state, demo accounts, and cross-device sign-in remain unverified.

## Phase 4 — Employee portal — implemented and locally tested

`src/app/(employee)/roadmap` reads only RLS-scoped journey snapshots and calculates progress from eligible, unlocked activities. `src/features/employee-journey/actions.ts` validates requests and calls the database completion RPC. The RPC checks identity, ownership, journey state, unlock date, payload, form fields, and quiz answer against a protected server-side answer key. Failed pass-required quiz attempts are saved and can be retried. Opening content does not complete it.

`src/app/(employee)/resources` lists audience-matched published content. `src/app/(employee)/support` lists active contacts within the profile's scope. `src/app/(employee)/profile` shows the signed-in employee's profile and submits separate UX feedback. Migration `202610220005_employee_support_feedback.sql` applies RLS to support and feedback data. Migration `202610220004_activity_completion.sql` keeps quiz answers and form submissions protected and adds server-checked completion.

Local acceptance uses two employee identities and an HR identity in PGlite. Tests verify cross-employee denial, private answer-key isolation, completion ownership, form validation, quiz scoring/retry, and feedback isolation. No hosted identity provider or real multi-device login has been configured.

## Phase 5 — Admin workflow and progress — implemented and locally tested

The HR Admin dashboard reads recent journeys, summarizes active assignments and overdue activities, and shows recent employee UX feedback. `/admin/employees` lists active employee profiles and published templates, then assigns an audience-validated immutable snapshot through the database RPC. `/admin/progress` shows scoped employee progress and activity history and offers complete, waive, or reopen actions with an audit note. `/admin/settings/support` creates, edits, and archives contacts with explicit scope.

Migrations `202610220006_admin_operations.sql` and `202610220007_template_update_preview_apply.sql` implement HR-only progress, support-contact, preview, and apply RPCs. Direct client writes remain denied. Activity transitions record an actor, timestamp, action, and required note in `activity_events`. A published template detail page shows per-employee added/updated/removed/preserved counts, scope eligibility, and the expected version. HR explicitly applies a selected preview. The database rejects stale versions and out-of-scope or incompatible content, adds/updates/removes incomplete snapshots, preserves completed and waived snapshots, and records an audit row and activity events.

Local acceptance: PGlite verifies authorization for HR progress/support/template-update operations, records completion/waiver/reopen and template-update events, rejects employee preview/apply calls, preserves completed snapshots, and enforces valid support details. Hosted service and browser workflows still need verification against a configured project.

## Phase 6 — Hardening and handoff — locally checked, hosted checks pending

Run `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build`. Parse all PowerShell setup scripts. Smoke-test unauthenticated routes. `scripts/check-hosted-rls.ps1` is prepared to check two employee accounts and one HR Admin against hosted Auth/Data APIs, including private quiz answer-key isolation; it has not been run because the three demo passwords and privileged migration credentials are not configured in this workspace.

README covers local setup, Supabase configuration and migration, the repeatable synthetic seed, secure demo account provisioning, hosting, cross-account checks, and common errors. A hosted migration, hosted two-employee/one-admin policy run, real browser sign-in, and public deployment remain pending. The development dependency audit also has an open upstream ESLint/braces advisory recorded in the README; production-only dependencies currently audit clean.

## Hosting guidance

For prototype evaluation, the current candidate is a Render Free Node service plus a Supabase Free project. Render's free web services sleep after 15 minutes idle and have an ephemeral filesystem; Supabase Free has a 500 MB database quota, 5 GB egress, and can pause projects after one week of inactivity. Verify current limits before use. [Render Free limits](https://render.com/docs/free), [Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase).

Vercel Hobby is for personal, non-commercial use. A company-operated deployment needs a plan whose terms allow that use. [Vercel terms](https://vercel.com/legal/terms).
