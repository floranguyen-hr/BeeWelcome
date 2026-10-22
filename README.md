# Bee Logistics Onboarding Prototype

Prototype onboarding portal for validating HR and employee workflows. It uses synthetic records only and is not approved for real employee data or production use.

## Current implementation status

- Foundation and authentication are implemented locally: Next.js App Router, TypeScript, Supabase cookie sessions, role-gated routes, profile schema/RLS, and secure demo-account provisioning.
- Content Library and Template Builder are implemented with database-backed draft/publish/archive flows, version history, audience scopes, milestones, activity rules, and ordering.
- Employee journeys use immutable assignment snapshots. The synthetic seed creates five content items, a two-milestone template, five activities, and two demo journeys.
- Employee Roadmap supports self-confirmation, content acknowledgement, forms, and quizzes scored by a protected database function. Resources, scoped support contacts, read-only profile, and isolated UX feedback are implemented.
- HR Admin has a dashboard, employee/template assignment, audited progress actions, support directory management, and per-employee preview/apply for published template updates. Content Library and Template Builder are implemented.
- `.env.local` contains the Supabase project URL and publishable key; the configured Auth health endpoint returned HTTP 200. An anonymous filtered profile request returned HTTP 401, but that status alone does not establish whether the migrations or RLS policies are applied. The seven migrations, hosted demo accounts, cross-account authorization, and public website deployment have not been verified against that project.
- The seven current migrations and RLS policies pass 24 local PostgreSQL-compatible tests using PGlite. Hosted employee and HR Admin checks remain pending.
- Do not describe the prototype as production-secure or privacy-compliant.

## Technology

- Next.js App Router and TypeScript.
- Supabase Auth and PostgreSQL.
- Row Level Security on profiles, published content, support contacts, submissions, journeys, and progress data.
- Zod validates sign-in input.
- Vitest and PGlite exercise PostgreSQL RLS locally without requiring Docker.

The browser receives only the Supabase project URL and publishable key. The account provisioning script prompts for a privileged Supabase key through a hidden input; it is never part of the browser bundle or committed configuration.

The full development dependency audit currently reports five High findings through the ESLint tooling dependency tree; the production-only audit is clean. They point to the braces stack-exhaustion advisory, which affects versions through 3.0.3 and currently lists no patched release. Keep the lockfile pinned and recheck this advisory before release; do not downgrade the Next.js lint toolchain to silence it. [GitHub Advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Requirements

- Node.js 24 LTS and npm.
- A Supabase project for shared cloud authentication and data.
- For local Supabase services: Docker Desktop or another supported container runtime, plus the Supabase CLI.
- PowerShell for the included account and hosted-access scripts.

## Install and run locally

1. Install Node.js 24 LTS.
2. Install project dependencies:

       npm.cmd ci

3. Copy the environment template:

       Copy-Item .env.example .env.local

4. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local using the values shown in your Supabase project's API settings. These are public project settings; never put a secret key in a NEXT_PUBLIC variable.
5. Start the application:

       npm.cmd run dev

6. Open http://localhost:3000.

Without Supabase environment values, the landing page and a setup message are available. The sign-in form does not fake successful authentication.

## Supabase setup

1. Create a separate prototype project in Supabase.
2. In Authentication settings, disable public sign-ups. The application has sign-in only.
3. Set the Auth site URL to the deployed website origin and add the local origin http://localhost:3000 for development. Keep redirect URLs limited to the origins you control.
4. Apply schema migrations from the repository:

       npm.cmd run supabase -- login
       npm.cmd run supabase -- link --project-ref YOUR_PROJECT_REF
       npm.cmd run supabase -- db push

   The CLI may ask for the database password or access token interactively. Do not put them in repository files or chat.
5. For a local Supabase stack, start Docker Desktop, then run:

       npm.cmd run supabase -- start
       npm.cmd run supabase -- db reset

   Local startup prints local API credentials. Use the local secret/service key only in the hidden prompt of the provisioning script. The reset invokes the seed before demo Auth users exist, so it safely skips and prints a notice.

The migrations create profiles, Content Library and versions, templates and activities, employee journeys and immutable activity snapshots, private quiz configuration, submissions, support contacts, UX feedback, and audited template-update history. Scope-aware RLS and server-side RPCs protect employee data and privileged writes. Published template updates show a per-employee preview and require explicit HR application; the database checks the expected version and preserves completed snapshots. Supabase CLI local startup requires a container runtime; the PGlite test suite applies all current repository migrations without Docker.

## Create and manage demo accounts

The provisioning script creates four separate synthetic identities:

- hr-admin@bee-onboarding.invalid — bootstrap HR Admin.
- hrd@bee-onboarding.invalid — a separate demo HRD login with the same hr_admin permissions in this prototype because the role model has no separate HRD capability set.
- employee-a@bee-onboarding.invalid — Employee A.
- employee-b@bee-onboarding.invalid — Employee B.

The .invalid domain is reserved for examples. The script creates email-confirmed demo users so sign-in does not depend on sending mail. It prompts for each new password without echoing it, requires at least 14 characters, and never prints passwords. Existing passwords are kept on repeat runs. User and profile upserts make account setup repeatable.

Set the project URL in the current PowerShell session, then run the script:

    $env:SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
    .\scripts\provision-demo-accounts.ps1

For local Supabase, use its local API URL, usually http://127.0.0.1:54321, and the local service key. The script accepts only hosted Supabase and documented local API URLs.

To rotate all four demo passwords interactively:

    .\scripts\provision-demo-accounts.ps1 -ResetPasswords

The script uses the Supabase Auth Admin API to create identities and upsert profiles. Treat its API key as a privileged secret: enter it only in the hidden prompt, do not save it in .env.local, and rotate it if exposed. Ordinary profile updates cannot change roles; this trusted provisioning path is the only demo role-provisioning workflow.

## Seed synthetic demo data

After applying migrations and provisioning all four demo accounts, run the seed. It creates five fictional content items (including a private-scored quiz and a form), a published two-milestone template, five activities, synthetic Employee A/B organization attributes, one snapshot journey per employee, and assignment audit events. It is safe to rerun; existing journey snapshots are not overwritten.

For local Supabase:

    .\scripts\seed-demo-data.ps1 -Target local

For a linked hosted project after Supabase CLI login and project linking:

    .\scripts\seed-demo-data.ps1 -Target linked

The seed SQL contains only synthetic sample text and reserved .invalid demo identities. Never add real staff records, internal procedures, contact details, credentials, or secrets to the seed. Both employees can sign in from separate devices and read their saved journey from the shared database.
## Test and verify

Run the local checks:

    npm.cmd run typecheck
    npm.cmd run lint
    npm.cmd test
    npm.cmd run build

The RLS test fixture includes two employee identities and two HR Admin identities. It applies all repository migrations to PGlite and checks per-employee profile, audience, journey, activity, event, feedback, and submission isolation; HR Admin reads; draft/current-version visibility; anonymous denial; employee role/progress-write denial; management and support RPC authorization; template authoring/versioning/order/removal; audience-safe assignment; immutable snapshots; private quiz answer protection and server-side scoring; form validation; audited progress changes; per-employee template preview/application with completed snapshot preservation; and seed rerun behavior. These tests execute the SQL locally and do not prove the hosted project's configuration.

After applying migrations, provisioning accounts, and running the synthetic seed in a hosted project, run the provider-level check:

    .\scripts\check-hosted-rls.ps1

It prompts for the two employee passwords and the bootstrap HR Admin password without echoing them. It checks hosted Auth and Data APIs for each employee's own profile, journey, activities, and events; cross-employee denial; employee role-change denial; quiz answer-key isolation; and HR Admin visibility into profiles, journeys, and private quiz configuration. Run this against the deployment project and record its output before marking hosted authorization verified.

## Prototype hosting and shared data

Suggested low-cost prototype setup: a Render Free Node web service for the Next.js server and a Supabase Free project for Auth and PostgreSQL. Render supports full Next.js web services, but free services spin down after 15 minutes idle and may take about a minute to wake. Supabase Free currently includes 500 MB database size, 50,000 monthly active users, 5 GB egress, and 1 GB file storage; free projects may pause after a week of inactivity and do not include automatic backups. Check each provider's current terms and quotas before deployment. [Render Free limits](https://render.com/docs/free), [Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase).

For Render, connect a repository in the dashboard and configure:

- Runtime: Node.
- Build command: npm ci && npm run build.
- Start command: npm start.
- Environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
- Node version: 24 LTS.

The Supabase project is the shared database, so all signed-in devices access the same persisted records. Render's local filesystem is not used for application data. Configure the production website URL in Supabase Auth settings, then provision demo accounts and apply database migrations.

Vercel can host Next.js, but its Hobby plan is restricted to personal, non-commercial use. For an organization-run prototype, use a Vercel plan whose terms allow the intended use or select another suitable host. [Vercel plan terms](https://vercel.com/legal/terms).

Render Free and Supabase Free are suitable only for prototype evaluation. The free services can sleep, pause, restart, lose local files, or enforce quotas. The Render service may be publicly reachable; application pages still require authentication and database policies. Do not upload actual employee records, confidential policies, or internal documents.

## Common issues

- **Login reports missing Supabase configuration:** check the two NEXT_PUBLIC variables in .env.local and restart the development server.
- **Login succeeds at Auth but is rejected by the app:** provision the matching profile, ensure it is active, and confirm its role using the trusted account script.
- **A profile query returns no rows:** apply the migration and sign in with a provisioned identity; RLS intentionally hides other employees profiles.
- **Roadmap has no assigned journey:** confirm demo accounts were provisioned, then run scripts/seed-demo-data.ps1 for the same local or linked project the app uses.
- **A migration fails:** check that the project is linked to the expected Supabase ref, review the migration error, and do not edit the hosted schema manually without a migration.
- **Local Supabase does not start:** start Docker Desktop and confirm the required ports are free. The test suite does not require the local Supabase stack.
- **The hosted access check fails:** do not widen RLS to make the test pass. Review the migration, Auth account profiles, project URL, and API key configuration.
- **The app wakes slowly or is temporarily unavailable:** the free web service may have spun down or the database project may be paused; review both provider dashboards and usage status.

## Project structure

- src/app: route composition, layouts, and route actions.
- src/features/auth: sign-in and role-aware session resolution.
- src/features/admin-operations: validated assignment, support-directory, and progress actions.
- src/lib/supabase: browser/server clients and cookie refresh.
- src/lib/validation: request-boundary schemas.
- supabase/migrations: versioned schema and RLS policy changes.
- supabase/tests: database access-control tests.
- scripts: trusted demo-account provisioning and hosted RLS verification.
- docs/IMPLEMENTATION_PLAN.md: accepted phased plan and feature responsibilities.
