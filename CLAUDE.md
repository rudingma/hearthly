# Hearthly — Project Instructions

## Project Overview

Family management app. Phase 1 = infrastructure setup (no features). See `tasks/project-setup/project-summary.md` for architecture decisions and `tasks/project-setup/project-plan.md` for implementation tasks.

**Domain:** hearthly.dev

## Environment

- **Runtime:** Node.js 24 LTS (Krypton) via nvm
- **Package manager:** npm 11
- **Monorepo:** Nx (use `npx nx` — not installed globally)
- **ORM:** Prisma 7 (use `npx prisma` — not installed globally)
- **Containers:** Docker 28 + Docker Buildx (multi-platform: amd64 + arm64)
- **Infrastructure:** Terraform 1.13, hcloud CLI 1.62
- **Kubernetes:** kubectl 1.34, Helm 3.17, ArgoCD CLI 3.3
- **Git hosting:** GitHub (gh CLI 2.88), private repo
- **CI/CD:** GitHub Actions → GHCR → ArgoCD

## Architecture

- **Frontend:** Angular + Capacitor
- **Backend:** NestJS + Prisma + PostgreSQL
- **Infrastructure:** Hetzner Cloud, k3s via kube-hetzner, ARM nodes (CAX11)
- **Ingress:** Traefik (bundled by kube-hetzner)
- **GitOps:** ArgoCD 3.x, app-of-apps pattern
- **Secrets:** Infisical (self-hosted, K8s operator)
- **Monitoring:** Prometheus + Grafana
- **Database:** CloudNativePG (self-hosted PostgreSQL)

## Build & Run Commands

```bash
# Local development
npx nx serve hearthly-api        # Backend (hot reload)
npx nx serve hearthly-app        # Frontend (hot reload)
docker compose up -d             # Local PostgreSQL

# Build
npx nx build hearthly-api
npx nx build hearthly-app

# Test
npx nx test hearthly-api
npx nx test hearthly-app

# Lint
npx nx lint hearthly-api
npx nx lint hearthly-app

# Prisma
npx prisma migrate dev           # Run migrations locally
npx prisma generate              # Regenerate client

# Docker (multi-platform)
docker buildx build --platform linux/amd64,linux/arm64 -f apps/hearthly-api/deploy/Dockerfile -t hearthly-api .
docker buildx build --platform linux/amd64,linux/arm64 -f apps/hearthly-app/deploy/Dockerfile -t hearthly-app .

# Infrastructure
cd infrastructure/cluster && terraform plan
cd infrastructure/cluster && terraform apply
```

## Code Conventions

- Full TypeScript end-to-end
- Modular monolith: modules communicate via service interfaces, not direct DB access
- Helm charts per app in `/apps/xxx/deploy/chart/`
- App-specific Terraform in `/apps/xxx/infra/`
- Shared platform infra in `/infrastructure/`
- Separate Terraform state per directory
- All cluster services managed via ArgoCD (except ArgoCD itself)

## Key Versions to Pin

- kube-hetzner: >= v2.18.1 (v2.18.0 broken)
- hcloud provider: >= v1.58.0 (DNS support, datacenter deprecation)
- ArgoCD Helm chart: >= v9.4 (3.x series)
- Prisma 7: generator `prisma-client`, output to source dir, NestJS needs `moduleFormat = "cjs"`
