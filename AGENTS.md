# AGENTS.md --- Ticket Management System

## 1. Mission

Build a production-minded, full-stack ticket management platform.
Priorities, in order:

1.  Correctness, security, and data integrity
2.  Maintainable architecture and clear boundaries
3.  Accessible, responsive UX
4.  Real-time behavior and performance
5.  SEO for public pages
6.  Documentation, tests, and deployability

Do not claim the system is "100% secure." Reduce risk through defense in
depth, tests, secure defaults, and documented operational controls.

## 2. Required technology

-   Nuxt 3 (or the current stable Nuxt version already selected by the
    repository), Vue 3, TypeScript, and Nitro.
-   Tailwind CSS.
-   shadcn-vue / Nuxt-compatible shadcn components. Verify compatibility
    before installing packages; do not assume React shadcn/ui works in
    Vue.
-   SQLite for the initial database.
-   Prisma ORM with migrations and generated client.
-   Socket.IO for authenticated real-time events.
-   A maintained schema-validation library such as Zod or Valibot, used
    consistently at trust boundaries.
-   A maintained authentication implementation compatible with
    Nuxt/Nitro. Evaluate current maintained options before choosing;
    document the choice and avoid inventing cryptography.
-   Automated tests: unit, integration, and end-to-end tests appropriate
    to the existing project.

Use pnpm unless the repository already standardizes another package
manager. Respect the existing lockfile. Never regenerate or partially
overwrite a lockfile casually.

## 3. Before coding

-   Inspect the repository, package manager, existing conventions, and
    current implementation.
-   Read the project context file (`FREEBUFF_CONTEXT.md`) and all
    relevant local instructions.
-   Identify available Freebuff skills. Search the installed skill
    catalog for relevant skills in Nuxt/Vue, TypeScript,
    Tailwind/shadcn-vue, Prisma/SQLite, authentication/security,
    Socket.IO, accessibility, SEO, testing, and code review. Read each
    selected skill's instructions before using it. Do not invent skill
    names or claim a skill was used if it is unavailable.
-   Produce a short implementation plan and identify
    architectural/security decisions before large changes.
-   Prefer small, reviewable changes. Do not rewrite working code
    without a concrete reason.

## 4. Architecture

Keep a clear separation between:

-   `pages/`: route-level pages and layouts
-   `components/`: reusable UI components, grouped by domain
-   `composables/`: client-side reusable state and behavior
-   `server/api/`: HTTP endpoints and request handlers
-   `server/services/`: business rules and use cases
-   `server/repositories/`: persistence access where separation adds
    value
-   `server/middleware/`: request-level authentication and security
    controls
-   `server/utils/`: server-only helpers
-   `prisma/`: schema, migrations, and seed scripts
-   `shared/`: types and validation schemas safe to share between client
    and server
-   `tests/`: unit, integration, and end-to-end tests
-   `docs/`: architecture, threat model, operations, and decisions

Keep secrets, Prisma, database access, privileged authorization, and
server-only dependencies out of client bundles. Do not put business
logic in Vue components or Socket.IO event handlers.

Use service-layer authorization for every sensitive use case. UI hiding
is not authorization.

## 5. Product scope and roles

Implement at least these roles:

-   `USER`: can create tickets, see only tickets they are authorized to
    access, reply to their own tickets, and edit/cancel only when policy
    allows.
-   `ADMIN`: can access the support workspace, triage and assign
    tickets, change status/priority, reply, and manage permitted users.
-   `OWNER`: highest-privilege account; can manage administrators and
    security settings, review audit events, and perform owner-only
    actions.

Use deny-by-default authorization. Define permissions centrally and test
them. Never trust a role, user ID, owner flag, or permission sent by the
browser.

Public registration must never allow a visitor to choose `ADMIN` or
`OWNER`. Provision the initial owner through a documented, one-time,
server-side bootstrap process using environment secrets or a secure CLI
command. Do not hardcode a default owner password.

## 6. Authentication and owner access

-   Use established password hashing (Argon2id preferred when supported;
    otherwise a currently recommended secure password-hashing
    configuration). Never store plaintext passwords or reversible
    password encryption.
-   Use secure, HTTP-only, SameSite cookies; set `Secure` in production.
    Prefer server-managed sessions with rotation and revocation over
    long-lived browser-stored tokens.
-   Protect login, registration, password reset, and sensitive actions
    against brute force and enumeration. Use generic authentication
    error messages and rate limits.
-   Implement email verification and password reset only with expiring,
    single-use, securely generated tokens; store token hashes, not raw
    tokens.
-   Regenerate session identifiers after login and privilege changes.
    Revoke sessions on logout, password change, account disablement, and
    role changes as appropriate.
-   Add CSRF protection for cookie-authenticated state-changing
    requests. Validate `Origin`/`Host` where appropriate and use safe
    HTTP methods correctly.
-   Require MFA for `OWNER` and preferably all administrators. Use TOTP
    with recovery codes, or a stronger supported factor if available.
    Recovery codes must be one-time and stored hashed.
-   The owner "secret" is an additional server-side
    bootstrap/configuration secret, not a substitute for password + MFA.
    Never expose it to the browser, logs, API responses, source control,
    or client runtime config.
-   Do not create a public "secret URL" or secret query parameter for
    admin login. The admin route may be unlisted, but obscurity is not
    security.
-   Require step-up authentication for critical actions such as changing
    owner/admin roles, rotating security settings, or exporting
    sensitive data.
-   Add session/device management and audit logs for privileged actions.

## 7. Ticket domain and workflow

Support:

-   Ticket creation with subject, category, detailed description,
    priority, optional attachments, and relevant metadata.
-   Ticket list, detail, authorized editing, and policy-controlled
    deletion/closure.
-   Status lifecycle such as `OPEN`, `IN_PROGRESS`, `WAITING_FOR_USER`,
    `RESOLVED`, `CLOSED`.
-   Priorities such as `LOW`, `NORMAL`, `HIGH`, `URGENT`.
-   Assignment to an administrator, internal notes visible only to
    staff, and public replies visible to the ticket requester.
-   Ticket conversation timeline with author, timestamp, and message
    visibility.
-   Search, pagination, sorting, and filters by status, priority,
    category, assignee, requester, and date.
-   Reopen rules and a documented status-transition policy.
-   File attachments only if implemented securely: enforce size/type
    limits, inspect actual file content where feasible, generate random
    storage names, prevent executable/public path access, and authorize
    every download.
-   Optional notifications should not leak ticket content to
    unauthorized recipients.

Every ticket and message query must enforce object-level authorization
on the server. Avoid insecure direct object references (IDOR).

## 8. Real-time behavior

-   Socket.IO must authenticate the connection using the same
    server-side session/authentication source as HTTP.
-   Authorize every room join and every event. A client must never be
    able to join `ticket:<id>` merely by supplying an ID.
-   Derive user identity and role from the verified server session,
    never from client event payloads.
-   Use rooms scoped to authorized users/tickets. Avoid broadcasting
    private content to global rooms.
-   Validate event payloads and rate-limit event submission.
-   Define event names and payload types in shared contracts.
-   Treat sockets as a delivery mechanism, not the source of truth.
    Persist changes transactionally first, then emit events.
-   Handle reconnects, missed events, duplicate delivery, and stale UI
    by refetching authoritative data. Do not promise exactly-once
    delivery.
-   Ensure logout, session expiry, account disablement, and role changes
    invalidate or disconnect relevant sockets.
-   If deployment topology requires a Socket.IO adapter or shared
    session store, document and implement it. Do not assume in-memory
    state works across multiple instances.

## 9. Database and Prisma

-   Use SQLite for local/initial deployment and Prisma ORM for all
    normal persistence.
-   Define explicit relations, indexes, unique constraints, enums (or
    validated string unions where SQLite/Prisma constraints require),
    timestamps, and deletion behavior.
-   Include entities at minimum for users, sessions, tickets, ticket
    messages, attachments (if enabled), MFA credentials/recovery codes,
    audit logs, and notification records if notifications are
    implemented.
-   Store timestamps consistently in UTC; format for the user's locale
    in the UI.
-   Use migrations. Never use `db push` as the production migration
    strategy.
-   Add safe seed data for development only. Never seed production with
    known credentials.
-   Use transactions for multi-step state changes and audit records.
-   Consider SQLite's write-concurrency and deployment filesystem
    constraints. Do not deploy a SQLite database on ephemeral storage or
    an unsupported network filesystem. Document backups, restore tests,
    and migration procedures.
-   Keep database files and backups outside public/static directories.

## 10. Security baseline

Create and maintain a threat model. At minimum address:

-   Broken access control / IDOR
-   Authentication and session compromise
-   CSRF, XSS, SQL injection, command injection, and SSRF
-   Brute force and credential stuffing
-   Mass assignment and unsafe object binding
-   Malicious uploads
-   Sensitive data leakage in logs, errors, analytics, and real-time
    events
-   Dependency and supply-chain risks
-   Misconfigured CORS, cookies, headers, and deployment secrets

Required practices:

-   Validate all untrusted input on the server; client validation is for
    UX only.
-   Use Prisma parameterized operations; do not concatenate untrusted
    SQL.
-   Escape/render user content safely. Avoid `v-html`; if rich text is
    essential, sanitize with a maintained allowlist sanitizer.
-   Apply a restrictive Content Security Policy and security headers
    compatible with the app. Avoid unsafe inline scripts where feasible.
-   Configure CORS with explicit trusted origins; never use wildcard
    origins with credentials.
-   Set request body, upload, and pagination limits.
-   Rate-limit authentication, ticket creation/replies, search, and
    sensitive endpoints.
-   Use generic production errors; never return stack traces, SQL,
    secrets, or internal paths.
-   Redact credentials, tokens, cookies, MFA secrets, and sensitive
    ticket data from logs.
-   Keep dependencies patched; review new packages and run
    audit/scanning tools where available.
-   Store secrets in environment/secret management, validate required
    env vars at startup, and provide `.env.example` with placeholders
    only.
-   Do not commit `.env`, database files, uploads, private keys, or
    backups.
-   Use TLS in production and document reverse-proxy trust
    configuration.
-   Add audit logging for sign-in events, MFA changes, role/permission
    changes, ticket assignment/status changes, exports, and owner/admin
    actions. Avoid logging secret values.

## 11. UI/UX requirements

Visual direction:

-   Minimal, polished, professional SaaS dashboard.
-   Strong information hierarchy, generous whitespace, restrained color
    palette, subtle borders, consistent radii, and limited shadows.
-   Responsive from mobile to wide desktop. Do not merely shrink desktop
    tables; provide mobile-friendly cards, overflow handling, or
    deliberate alternate layouts.
-   Use shadcn-vue components consistently, with accessible labels,
    focus states, keyboard support, and clear validation/error states.
-   Support light and dark themes if it can be done consistently.
-   Use charts only where they help decision-making. Charts must use
    real aggregated data, correct date ranges, loading/empty/error
    states, and accessible labels. Never fabricate dashboard metrics.
-   Include skeleton/loading states, empty states, confirmation for
    destructive actions, toast feedback, and graceful network/realtime
    failure handling.
-   Build reusable form fields, status/priority badges, filters, data
    tables, pagination, dialogs, and page headers.
-   Persian/RTL support should be considered if the product is intended
    for Persian-speaking users; do not hardcode direction assumptions.
    Keep locale and direction configurable.

Required public/authenticated areas:

-   Public landing page explaining the support platform, how it works,
    benefits, and clear sign-up/sign-in calls to action.
-   Registration, login, password reset, and MFA challenge pages as
    applicable.
-   Authenticated user dashboard and ticket list.
-   Detailed ticket creation form with category, subject, description,
    priority, attachment guidance, and validation.
-   Ticket detail page with conversation, replies, status, and timeline.
-   Admin dashboard with real statistics, ticket queues, filters,
    assignment, and ticket management.
-   Owner security/admin management area with MFA and audit events.

## 12. SEO and performance

-   Make public landing and public informational pages server-rendered
    and SEO-friendly with unique titles, descriptions, canonical URLs,
    Open Graph metadata, semantic headings, and sitemap/robots
    configuration as appropriate.
-   Do not index private dashboards, ticket content, auth pages, or
    personal data. Use appropriate robots directives and access
    controls; robots.txt is not security.
-   Optimize images, fonts, route payloads, and data fetching. Avoid
    unnecessary client-only rendering.
-   Use pagination and server-side filtering for large lists.
-   Avoid N+1 queries and unbounded database reads.

## 13. Testing and quality gates

Before declaring a feature complete:

-   Unit-test business rules, validation, permissions, status
    transitions, and security-sensitive helpers.
-   Integration-test API handlers and database behavior.
-   Test that users cannot read/update/delete another user's tickets or
    messages.
-   Test role escalation attempts, unauthorized admin/owner access,
    CSRF, rate limits, and session revocation.
-   Test Socket.IO authentication, room authorization, private-event
    isolation, reconnect/refetch behavior, and invalid payloads.
-   End-to-end test registration/login, ticket creation, conversation,
    admin triage, owner MFA, and responsive critical flows.
-   Run formatter, linter, typecheck, migrations, and relevant test
    suites.
-   Add regression tests for every fixed bug.
-   Do not disable, weaken, or skip a test merely to make CI pass.
    Explain unavoidable gaps.

## 14. Documentation and delivery

Maintain:

-   `README.md`: overview, features, stack, prerequisites, setup,
    environment variables, database/migrations, development, tests,
    build, deployment, backup/restore, and troubleshooting.
-   `docs/ARCHITECTURE.md`: architecture, request flow, data model,
    real-time flow, and key decisions.
-   `docs/SECURITY.md`: threat model, auth/MFA, authorization matrix,
    secret handling, operational checklist, and known limitations.
-   `docs/DEPLOYMENT.md`: production setup, TLS/reverse proxy,
    persistent SQLite storage, backups, restore, migrations, and
    rollback.
-   `.env.example`: names and safe placeholders only.
-   Useful code comments explaining why, security assumptions, and
    non-obvious behavior. Avoid comments that merely restate the code.

## 15. Engineering rules

-   TypeScript strict mode. Avoid `any`; if unavoidable, isolate it and
    explain why.
-   No placeholder implementations presented as complete functionality.
-   No fake chart data in production paths.
-   No hardcoded credentials, secrets, user IDs, or privileged role
    defaults.
-   No client-side-only authorization.
-   No broad `catch` that silently swallows errors.
-   No unbounded list endpoints.
-   No direct database calls from UI components.
-   No emitting realtime events before the database transaction
    succeeds.
-   Do not expose Prisma models or internal database errors directly as
    API contracts.
-   Keep API response shapes consistent and typed.
-   Prefer clear, boring, well-tested code over clever abstractions.
-   Update documentation and tests when behavior or architecture
    changes.

## 16. Definition of done

A feature is done only when its UI, server behavior, validation,
authorization, persistence, realtime behavior (if relevant), error
states, tests, and documentation are complete. Report what was actually
implemented, which checks were run, their results, and any remaining
risks. Never claim security or deployment checks passed unless they were
run.
