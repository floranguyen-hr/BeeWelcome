# Test Plan and Acceptance Checklist

## 1. Authentication and roles

-   [ ] Unauthenticated visitor is redirected/blocked from private
    portal data.
-   [ ] HR Admin can sign in and access admin functions.
-   [ ] Employee can sign in and access employee portal.
-   [ ] Employee cannot change own role to HR Admin.
-   [ ] Expired/invalid session is handled safely.
-   [ ] Demo credentials are not committed to source control.

## 2. Cross-account authorization

Use at least HR Admin, Employee A, and Employee B. - \[ \] Employee A
can read their own profile/journey/activities. - \[ \] Employee A cannot
read Employee B's data by changing URL, ID, query, or request payload. -
\[ \] Employee A cannot submit completion for Employee B's activity. -
\[ \] Employee A cannot view Employee B's quiz answers. - \[ \] Employee
cannot create/publish content or templates unless explicitly
authorized. - \[ \] Direct API/database calls are blocked by server
checks/RLS when unauthorized.

## 3. Content Library

-   [ ] HR creates a draft and publishes it.
-   [ ] Employee sees only content permitted by scope/access rules.
-   [ ] HR edits content and publishes a new version.
-   [ ] Active references show the current published version.
-   [ ] Completion is preserved after content update by default.
-   [ ] Archive warns about dependencies and preserves history.
-   [ ] Invalid content payload and unsupported file types are rejected.

## 4. Template Builder and assignment

-   [ ] HR creates template, milestones, and ordered items.
-   [ ] Required/optional, availability, due date, completion rule, and
    progress inclusion are persisted.
-   [ ] Assigning a template creates one journey and the expected
    activity instances.
-   [ ] Assignment failure does not leave a partially created journey.
-   [ ] Employee-specific additions/removals do not change the master
    template or other employees.
-   [ ] Publishing a structural template change does not silently alter
    active journeys.
-   [ ] Explicitly applying a template change previews and records the
    change.

## 5. Employee completion

-   [ ] Locked activities cannot be completed early.
-   [ ] Opening content alone does not complete an activity by default.
-   [ ] Offline task self-confirmation records timestamp and source.
-   [ ] Participation-only quiz/form completes after valid submission.
-   [ ] Pass-required quiz does not complete on a failing submission.
-   [ ] Completion is recorded once and is idempotent for repeated
    requests.
-   [ ] UX feedback from My Profile does not affect onboarding progress.

## 6. Progress calculations

-   [ ] Future locked activities are excluded from denominator.
-   [ ] Removed activities are excluded.
-   [ ] Activities with `include_in_progress=false` are excluded.
-   [ ] Equal-weight calculation matches expected percentage.
-   [ ] Zero eligible activities shows a neutral message, not division
    by zero or misleading 100%.
-   [ ] As activities unlock, denominator changes according to rules.
-   [ ] Progress is not described as competency or probation rating.

## 7. Persistence and multi-device behavior

-   [ ] HR creates content; refresh does not lose it.
-   [ ] Employee completes activity; refresh does not lose completion.
-   [ ] HR on another session/device sees the same persisted update
    after refresh.
-   [ ] Errors are shown when database/network is unavailable; app does
    not fake success.

## 8. UX/accessibility

-   [ ] Responsive layout on desktop and mobile browser.
-   [ ] Loading, empty, validation, error, and permission-denied states
    exist for major flows.
-   [ ] Inputs have labels and keyboard focus is visible.
-   [ ] Long titles/content do not break layouts.
-   [ ] No fake contact details are presented as real company contacts.

## 9. Build and security hygiene

-   [ ] Lint/type-check/tests/build commands run and results documented.
-   [ ] No service-role key or secret is present in browser bundle.
-   [ ] `.env` and secrets are ignored by version control.
-   [ ] RLS is enabled on all client-accessible private tables if
    Supabase is used.
-   [ ] Migrations and seed instructions are documented.
