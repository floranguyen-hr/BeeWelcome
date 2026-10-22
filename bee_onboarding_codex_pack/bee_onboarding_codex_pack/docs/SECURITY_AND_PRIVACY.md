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
