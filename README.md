# Envello

Note-taking and productivity app (Angular 19, standalone components, signals).

## Prerequisites

- Node.js 20+
- npm 9+

## Install

```bash
npm install
```

## Development

```bash
npm start
# or
npm run dev
```

Open [http://localhost:4200](http://localhost:4200). The app will reload on file changes.

## Build

| Command | Description |
|--------|--------------|
| `npm run build` | Development build (no env replacement) |
| `npm run build:prod` | Production build (uses `environment.prod.ts`) |
| `npm run build:staging` | Staging build (uses `environment.staging.ts`) |

Output: `dist/envello/`

## Tests

```bash
npm test
```

Runs unit tests with Karma. Use `--no-watch --browsers=ChromeHeadless` for CI.

## Project structure

- `src/app/components/` – feature and layout components (lazy-loaded by route)
- `src/app/core/` – services (API, auth, logging), guards, interceptors, global error handler
- `src/app/services/` – domain services (store, articles, books, etc.)
- `src/environments/` – dev, staging, prod config (no secrets)

## Enterprise roadmap

See [ENTERPRISE_IMPROVEMENTS.md](./ENTERPRISE_IMPROVEMENTS.md) for production readiness (auth, backend API, CI/CD, accessibility, i18n, etc.).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

Private.
