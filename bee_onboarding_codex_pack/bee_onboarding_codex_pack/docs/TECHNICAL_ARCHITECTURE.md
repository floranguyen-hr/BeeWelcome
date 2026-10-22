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
