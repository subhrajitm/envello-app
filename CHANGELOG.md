# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-29

### Added

- **Enterprise foundation**
  - Environment configuration (development, staging, production) with `src/environments/`
  - Lazy-loaded routes for all feature areas (overview, novels, tasks, daily-notes, etc.)
  - Central API service stub (`core/services/api.service.ts`) for future backend integration
  - Global error handler and logging service (`core/errors/global-error.handler.ts`, `core/services/logging.service.ts`)
  - 404 (Not Found) and 500 (Server Error) pages with user-friendly messaging
  - Auth service and auth guard stubs (`core/services/auth.service.ts`, `core/guards/auth.guard.ts`)
  - HTTP interceptors: auth (token attachment) and error/retry (retries, 5xx redirect)
  - App version displayed in footer (from environment)
- **Project identity**
  - Package renamed from `angular-temp` to `envello-app`
  - Version set to `0.1.0`; build scripts `build:staging` and `build:prod` added
- **DevOps**
  - GitHub Actions CI workflow: build (production) and unit tests on push/PR to main/master
- **Documentation**
  - `ENTERPRISE_IMPROVEMENTS.md` – enterprise production readiness roadmap
  - `CHANGELOG.md` – this file
  - README updated for Envello

### Changed

- Wildcard route now redirects to `/not-found` instead of `/overview`
- `angular.json`: project name and output path updated to `envello-app`; production/staging fileReplacements for environments

### Security

- No secrets in environment files; API base URL and feature flags only
- Auth and HTTP interceptors prepared for token-based backend auth

[0.1.0]: https://github.com/your-org/envello-app/releases/tag/v0.1.0
