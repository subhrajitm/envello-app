# Enterprise Production Readiness – Envello App

This document outlines improvements needed to make Envello a **production-level enterprise application**. Items are grouped by domain and ordered by impact and typical implementation order.

---

## 1. Architecture & Application Structure

### 1.1 Route lazy loading
**Current:** All route components are eagerly loaded in `app.routes.ts`.  
**Improvement:**
- Use `loadComponent` for every feature route so only the active area is loaded.
- Reduces initial bundle size and improves Time to Interactive (TTI).

```ts
// Example: app.routes.ts
{
  path: 'tasks',
  loadComponent: () => import('./components/tasks/tasks.component').then(m => m.TasksComponent),
  data: { hasSidebar: true },
}
```

Apply the same pattern for: overview, novels, novel-editor, research, articles, journals, daily-notes, meetings, books, snippets, activity-log, bin.

### 1.2 Environment configuration
**Current:** No `environment.ts`; no distinction between dev/staging/prod.  
**Improvement:**
- Add `src/environments/environment.ts` and `environment.prod.ts` (and optional `environment.staging.ts`).
- Put API base URL, feature flags, log level, and non-secret config in environment files.
- Use Angular’s `fileReplacements` in `angular.json` for production builds.
- Never put secrets (API keys, tokens) in environment files; use backend or secure vault.

### 1.3 Backend / API layer
**Current:** Data lives only in memory and `localStorage` (StoreService, ArticleService, etc.).  
**Improvement:**
- Introduce `@angular/common/http` and a small **API layer**: e.g. `core/services/api.service.ts` or feature-specific API services that call backend REST/GraphQL.
- Keep existing services as “facades” that use the API layer and optionally cache (e.g. with signals).
- Define shared **DTOs/interfaces** for request/response and map them in the API layer (not in UI components).
- Plan for **offline/conflict handling** later (e.g. sync service, conflict resolution).

### 1.4 Centralized state and persistence
**Current:** Multiple services (Store, Article, Books, etc.) each manage their own state and localStorage.  
**Improvement:**
- Keep signals but **centralize persistence**: e.g. a single `PersistenceService` or per-domain persistence that uses one strategy (e.g. IndexedDB for large data, localStorage for small prefs).
- Optionally introduce **NgRx** or **Signals + lightweight store** only for cross-cutting or complex flows (e.g. auth, global UI state) if the app grows.
- Document where “source of truth” lives (backend vs local) for each entity.

---

## 2. Security

### 2.1 Authentication and authorization
**Current:** No auth; user data in localStorage without protection.  
**Improvement:**
- Add **authentication** (e.g. JWT or session-based) and **route guards** (`AuthGuard`, optional `RoleGuard`).
- Protect routes so unauthenticated users are redirected to login.
- Store tokens in **httpOnly cookies** or secure storage; avoid long-lived tokens in localStorage.
- Implement **refresh token** flow and handle 401 globally (e.g. via HTTP interceptor → logout or refresh).

### 2.2 HTTP security (when API is added)
**Current:** No HTTP client.  
**Improvement:**
- **HTTP interceptor**: attach auth token, set `Content-Type`, and optionally add CSRF header from cookie.
- Use **HTTPS only** in production; consider **CSP** (Content-Security-Policy) headers.
- **Input validation** on client and server; sanitize rich text (e.g. TipTap/editor output) to prevent XSS.
- Avoid exposing **sensitive data** in URLs or logs.

### 2.3 Secure storage and sensitive data
**Current:** User/settings/notifications stored in localStorage in plain text.  
**Improvement:**
- For **PII/sensitive** data: encrypt at rest or move to backend and fetch only when needed.
- Prefer **sessionStorage** for session-specific data if appropriate.
- Do not store **passwords or raw secrets** in the frontend; only tokens with short expiry.

---

## 3. Reliability & Error Handling

### 3.1 Global error handler
**Current:** Only `bootstrapApplication(...).catch(console.error)` and component-level error toasts (e.g. tasks).  
**Improvement:**
- Implement **ErrorHandler** (and optionally **HttpInterceptor** for API errors) that:
  - Logs errors to a **logging service** (see below).
  - Shows a **user-facing message** or redirects to a generic error page for fatal errors.
  - Does not expose stack traces or internal details in production.
- Consider **Zone.js error handling** or a top-level catch so uncaught promise rejections are handled.

### 3.2 Logging service
**Current:** Ad-hoc `console.log` / `console.error`.  
**Improvement:**
- Add a **LoggingService** with levels (e.g. debug, info, warn, error).
- In production: send errors (and optionally key events) to a **backend log collector** or third-party (e.g. Sentry, LogRocket).
- In development: log to console with consistent format; support **correlation IDs** for requests if you have a backend.

### 3.3 HTTP interceptor (retry, timeout, errors)
**When HTTP is introduced:**
- **Timeout** for all or critical API calls.
- **Retry** with backoff for transient failures (e.g. 5xx, network errors).
- Map **HTTP status codes** to user messages and trigger global error handler or notification service for 4xx/5xx.
- Optionally **cache** GET responses where appropriate (e.g. with cache headers or in-memory TTL).

### 3.4 User-facing error and maintenance pages
- **404 page**: custom component for unknown routes instead of only redirecting to overview.
- **500 / “Something went wrong”** page for unrecoverable errors.
- Optional **maintenance** page and feature flag or route to show it when deploying.

---

## 4. Performance

### 4.1 Bundle and load
- **Lazy loading** (see 1.1) to split by feature.
- **Tree-shaking**: ensure barrel files (e.g. `shared/ui`) don’t pull in unused code; use direct imports where it helps.
- **Budget enforcement**: keep existing `angular.json` budgets; add **budget for lazy chunks** if needed.
- **Analyze bundle**: e.g. `ng build --stats-json` and **webpack-bundle-analyzer** (or Angular’s source-map explorer) to find large dependencies.

### 4.2 Change detection and rendering
- Use **OnPush** where possible for smart/components that receive inputs and signals.
- **TrackBy** for all `@for`/`*ngFor` over lists (you already use `track` in templates; ensure IDs are stable).
- **Virtual scrolling** for long lists (e.g. tasks, notes, activity log) – you already have some support in tasks; extend and reuse.

### 4.3 Caching and offline
- **Service Worker**: add Angular PWA (e.g. `ng add @angular/pwa`) for asset caching and optional offline shell.
- **IndexedDB** (e.g. via Dexie or Angular’s storage) for larger local data (novels, notes) to avoid localStorage limits and improve load time.
- **Stale-while-revalidate**: show cached data first, then refresh from API when online.

---

## 5. Testing

### 5.1 Unit tests
**Current:** Many components have a single “should create” spec; some have more.  
**Improvement:**
- **Critical paths**: tasks, notes, novels, auth – add tests for key actions (create, update, delete, filter).
- **Services**: test business logic and state transitions; mock HTTP and storage.
- **Coverage**: set a **minimum threshold** (e.g. 70–80% for core modules) in Karma or CI and enforce in PRs.
- Prefer **isolated** tests (no full router/native APIs unless needed).

### 5.2 Integration tests
- Test **flows** that cross components (e.g. “create task → show in list → complete”).
- Use **Angular Testing Library** or similar to query by role/label and reduce reliance on implementation details.

### 5.3 End-to-end (E2E)
**Current:** No E2E.  
**Improvement:**
- Add **Cypress** or **Playwright** and a small set of **critical E2E tests** (login, create task, open note, navigate main areas).
- Run E2E in CI against a **staging or test backend** (or mocked API).
- Optional: **visual regression** for key screens.

### 5.4 API and backend mocking
- **MSW (Mock Service Worker)** or Angular’s `HttpTestingController` for unit/integration tests.
- Document **contract** between frontend and backend (e.g. OpenAPI) and generate mocks from it if possible.

---

## 6. DevOps & Release

### 6.1 CI/CD
**Current:** No automation.  
**Improvement:**
- **GitHub Actions** (or similar): on every PR and main branch:
  - `npm ci && npm run build` (production build).
  - `npm test` (unit tests, coverage).
  - Optional: E2E on merge to main or nightly.
- **Deploy** from main (or release tag) to **staging** first, then **production** (manual approval or automated with checks).
- **Branch protection**: require passing CI and optionally code review before merge.

### 6.2 Build and versioning
- **Version**: use `package.json` version and/or **Git tag** (e.g. `v1.2.3`); inject version into app (e.g. via environment or build script) and show in UI (e.g. Settings / About).
- **Changelog**: maintain `CHANGELOG.md` (or use conventional commits + automated changelog).
- **Artifact storage**: publish build artifacts (e.g. to S3, GCS, or CI artifact store) and keep last N production builds.

### 6.3 Environment-specific builds
- **Development**: `ng build` or `ng serve` with env pointing to dev API, verbose logs.
- **Staging**: build with staging API URL and feature flags; deploy to staging URL.
- **Production**: build with prod API URL, no source maps (or separate source-map upload to error tracking), minification, and AOT.

### 6.4 Health and monitoring
- **Backend**: expose `/health` or `/ready`; frontend can call it from a “System status” or admin page.
- **Frontend**: optional **error tracking** (e.g. Sentry) and **RUM** (Real User Monitoring) for load times and errors in production.
- **Alerts**: on high error rate or failed deployments (via CI or monitoring tool).

---

## 7. Accessibility (A11y)

**Current:** Limited ARIA and keyboard support (a few components have some).  
**Improvement:**
- **Audit**: run **axe-core** or **Lighthouse** and fix critical/serious issues.
- **Semantic HTML**: use `<main>`, `<nav>`, `<section>`, headings hierarchy, and `<button>` vs `<div>` correctly.
- **ARIA**: labels for icon-only buttons, `aria-expanded` for dropdowns, `aria-live` for dynamic content (e.g. toasts).
- **Keyboard**: all actions available via keyboard; visible focus styles; trap focus in modals and restore on close.
- **Color**: sufficient contrast (WCAG AA); don’t rely on color alone for status.
- **Screen reader**: test with NVDA/JAWS/VoiceOver; ensure order and announcements make sense.
- Consider **angular-eslint** a11y rules and fix reported issues.

---

## 8. Internationalization (i18n)

**Current:** All strings in English in templates and code.  
**Improvement:**
- Use **Angular i18n** (`i18n` attributes and `ng extract-i18n`) or **ngx-translate** (or similar) for user-facing text.
- **Locale** for dates, numbers, and currency (e.g. `LOCALE_ID` or pipe options).
- **RTL**: if you ever need RTL, plan structure (logical properties, `dir` attribute) early.
- Store **language preference** (e.g. in user settings or localStorage) and load the right bundle or translation file.

---

## 9. Documentation & Maintainability

### 9.1 Code and architecture
- **README**: how to install, run, test, and build; link to architecture doc.
- **Architecture**: short doc or ADRs (Architecture Decision Records) for choices (e.g. “Why signals over NgRx”, “API layer structure”).
- **Component/service docs**: brief JSDoc for public APIs and complex logic; keep templates readable with clear variable names.

### 9.2 API and runbooks
- **API contract**: OpenAPI/Swagger for backend; share with frontend and use for mocks/tests.
- **Runbooks**: how to deploy, roll back, clear caches, and handle common incidents.
- **Security**: how secrets and tokens are managed, and how to rotate them.

### 9.3 Naming and project identity
- **Package name**: rename from `angular-temp` to e.g. `envello-app` or `@org/envello` in `package.json` and anywhere it’s referenced.
- **App title**: already “Envello” in index.html; keep branding consistent (About, emails, support).

---

## 10. Compliance & Legal (Enterprise)

- **Privacy**: privacy policy and consent (e.g. cookie/usage consent) if you collect PII or use analytics.
- **Data retention**: define how long user data is kept; implement delete/export where required (e.g. GDPR “right to erasure”, “data portability”).
- **Audit**: log sensitive actions (e.g. login, delete account, export) for compliance and security.
- **Terms of Service** and **Support** process for enterprise customers.

---

## 11. Summary – Priority Matrix

| Area                  | Priority | Effort  | Notes                                      |
|-----------------------|----------|---------|--------------------------------------------|
| Lazy loading          | P0       | Low     | Quick win for performance                  |
| Environment config    | P0       | Low     | Required before real API                   |
| API layer + HTTP      | P0       | High    | Unblocks backend integration               |
| Auth + guards         | P0       | Medium  | Required for multi-user/production         |
| Global error handler  | P1       | Low     | Improves reliability and UX               |
| Logging service       | P1       | Low     | Foundation for debugging and monitoring    |
| CI/CD                 | P1       | Medium  | Quality and safe releases                  |
| Unit test coverage    | P1       | Medium  | Per feature                                |
| E2E critical paths    | P2       | Medium  | After core flows are stable               |
| PWA / Service Worker | P2       | Medium  | Offline and resilience                    |
| Accessibility pass   | P2       | Medium  | Legal and inclusivity                     |
| i18n                  | P2       | High    | When targeting multiple locales            |
| Monitoring/APM        | P2       | Low–Med | After production traffic                   |

---

## 12. Suggested implementation order

1. **Phase 1 – Foundation (1–2 sprints)**  
   - Lazy load all routes.  
   - Add environments (dev/prod).  
   - Introduce HttpClient and a minimal API layer for one domain (e.g. tasks or notes).  
   - Global ErrorHandler and LoggingService.  
   - Rename package and set version in build.

2. **Phase 2 – Security & auth (1–2 sprints)**  
   - Auth (login, JWT/session, refresh).  
   - AuthGuard and optional role-based guard.  
   - HTTP interceptor (token, errors, optional retry/timeout).  
   - Secure storage and token handling.

3. **Phase 3 – Quality & release (ongoing)**  
   - CI: build, unit tests, coverage threshold.  
   - Expand unit tests for critical services and components.  
   - E2E for 3–5 critical flows.  
   - 404/500 pages and user-facing error handling.

4. **Phase 4 – Scale & polish**  
   - PWA and optional IndexedDB for large data.  
   - Accessibility audit and fixes.  
   - i18n if required.  
   - Monitoring, RUM, and alerting.

Use this as a living roadmap: adjust priorities and phases to match your backend timeline, team size, and compliance needs.
