# Hearthly — Project Instructions

## Project Overview

Family management app. See `docs/project-summary.md` for architecture decisions and key rationale.

**Work tracking:** GitHub Issues + GitHub Projects (kanban board). Milestones group feature work. Labels: `feature`, `bug`, `infra`, `documentation`.

**Domain:** hearthly.dev

## Environment & Architecture

- **Runtime:** Node.js 24 LTS via nvm (builds/tests), Bun 1.2.20 (API production runtime)
- **Package manager:** Bun (`bun install` — pinned to 1.2.20)
- **Monorepo:** Nx (use `npx nx` — not installed globally)
- **Frontend:** Angular + Ionic (Capacitor planned for mobile)
- **Backend:** NestJS + Drizzle ORM + PostgreSQL
- **Infrastructure:** Hetzner Cloud, k3s, Traefik (Gateway API), ArgoCD GitOps
- **Secrets:** Infisical (self-hosted, K8s operator)
- **Monitoring:** Prometheus + Grafana
- **Database:** CloudNativePG (self-hosted PostgreSQL)
- **Environments:** Production only (no staging). ArgoCD auto-deploys on merge to main.
- **Formatting:** Prettier with single quotes (`.prettierrc`)

## Build & Run Commands

**Quality gates (run before every commit):** `npx nx lint <app>` + `npx nx test <app>` + `npx nx build <app>` for affected apps. Helm charts: `helm template <name> <path>` to verify rendering.

```bash
# Initial setup
bun install                       # Install all dependencies
cp .env.example .env              # Configure local environment (edit values as needed)
docker compose up -d              # Start local PostgreSQL + Keycloak

# Local development
npx nx serve hearthly-api        # Backend (hot reload)
npx nx serve hearthly-app        # Frontend (hot reload)

# Build / Test / Lint
npx nx build hearthly-api
npx nx build hearthly-app
npx nx test hearthly-api
npx nx test hearthly-app
npx nx lint hearthly-api
npx nx lint hearthly-app

# GraphQL codegen (runs automatically before app build/test)
npx nx run hearthly-app:graphql-codegen  # Generate typed Angular services from API schema

# Docker (multi-platform — CI uses native ARM64 runners; local builds are slow via QEMU)
docker buildx build --platform linux/amd64,linux/arm64 -f apps/hearthly-api/deploy/Dockerfile -t hearthly-api .
docker buildx build --platform linux/amd64,linux/arm64 -f apps/hearthly-app/deploy/Dockerfile -t hearthly-app .
```

## Code Conventions

- Helm charts per app in `/apps/xxx/deploy/chart/`
- App-specific infra in `/apps/xxx/infra/`, shared platform infra in `/infrastructure/`
- Security contexts on all deployments (runAsNonRoot, drop ALL capabilities, seccomp RuntimeDefault)
- Trivy scans in CI with `exit-code: 1` and `ignore-unfixed: true`

## Git Workflow

**Issue lifecycle:**

1. Assign the issue to yourself and mark it **in progress** (`gh issue edit <#> --add-assignee @me`)
2. Create feature branch: `feat/<issue#>-<short-desc>` or `fix/<issue#>-<short-desc>`
3. Commit freely on the branch (small, incremental commits are fine — they get squashed)
4. Push branch and create PR via `gh pr create` — link the issue in the PR body
5. **Wait for CI to pass** before merging (CI runs lint/test/build, ~1-2 min)
6. Squash merge via `gh pr merge --squash --delete-branch`
7. Close the issue with `gh issue close <#> --comment "summary"` — reference the PR number

**Small changes** (docs, config, CLAUDE.md updates) not tied to an issue can be committed directly to main without a branch or PR.

**Commit messages:** Use `type(scope): description (#issue)` — e.g., `feat(api): add helmet for security headers (#25)`.

**Docs to update before shipping:** Check whether CLAUDE.md files need updates for new architecture, config, endpoints, commands, known issues, or environment changes. Docs ship with the PR.

## Production Health Checks

```bash
curl -sI https://hearthly.dev/             # Frontend (200)
curl -sI https://api.hearthly.dev/health   # API (200)
curl -sI https://auth.hearthly.dev/        # Keycloak (302)
curl -sI https://grafana.hearthly.dev/     # Grafana (302)
curl -sI https://argocd.hearthly.dev/      # ArgoCD (200)
curl -sI https://secrets.hearthly.dev/     # Infisical (200 or 302)
```

## Known Issues

- **Keycloak DB reset breaks app login:** Wiping the Keycloak DB assigns new UUIDs. The app DB still has old `keycloak_id` values. Fix: wipe both databases together: `docker compose down && docker volume rm hearthly_keycloak-pgdata hearthly_pgdata && docker compose up -d`.
