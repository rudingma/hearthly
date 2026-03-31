# Phase 2 Backlog

Items identified during Phase 1 that require Phase 2 context to implement.

## Security Middleware
- **Helmet** — Install `helmet` package, configure in NestJS `main.ts`. Needs CSP tuning once app has real routes/assets.
- **Content-Security-Policy** on nginx — Requires knowing exact resource origins (API URL, fonts, CDN). Configure after app shell has real content.
- **CORS configuration** — Define allowed origins when frontend calls API.

## Monitoring Readiness
- **API `/metrics` endpoint** — Needed for Prometheus ServiceMonitor (Task 15). Install `@willsoto/nestjs-prometheus` or similar.
- **Control plane memory** — Monitor for OOM kills. May need larger CP node (CAX21) if stability issues arise.

## CI/CD Improvements
- **Separate deployment repo** — For team development, split app source from deployment config to eliminate git-push race conditions.
- **Nx Cloud** — Free tier computation caching, reduces CI 50-90% after first run.
- **Self-hosted ARM runner** — If GitHub Actions ARM builds (QEMU) become too slow (>10 min), add a Hetzner CAX21 runner (~€7.50/month).

## Infrastructure
- **drizzle-kit in production image** — Trivy found CVEs in drizzle-kit's bundled esbuild binary. It's a devDependency that shouldn't ship in prod. Investigate why `nx prune` includes it and fix the pruning config.
- **Staging namespace** — Add when there are real features and users to justify it.

## Phase 2 Features (from project-summary.md)
- Keycloak deployment for authentication
- OIDC integration in NestJS and Angular
- Family/household data model and multi-tenancy
- Base UI layout (navigation, routing, theme)
- API design decisions (REST vs. tRPC vs. GraphQL)
- Kubernetes Gateway API migration (HTTPRoute replacing Ingress)
- NetworkPolicy and RBAC
