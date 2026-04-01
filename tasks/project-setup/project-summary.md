# Hearthly — Project Summary

## Vision

Hearthly is a family management app. It starts as a Haushaltsbuch (household budget tracker) and grows into a full family operating system — finances, groceries, schedules, chores, school, medical appointments, and more. First for parents, later expanding for kids.

**Domain:** `hearthly.dev` — registered via Cloudflare Registrar ($12/year). Nameservers will point to Hetzner DNS.

## Project Goals

This project serves two purposes:

1. **Learning** — Hands-on experience with Kubernetes, Terraform, GitOps, observability, and secrets management. The infrastructure complexity is intentional and serves the learning goal.
2. **Building a real product** — A family app that will grow over multiple phases into something usable.

## Development Philosophy

**AI-first development.** Claude Code implements ~99% of the app. The credo: "First try to connect the AI to a system before doing anything myself." The developer focuses on planning and decisions, not manual implementation. MCP integrations should maximize AI access to all systems.

## Phases

| Phase | Focus | Key Outcome |
|-------|-------|-------------|
| **Phase 1** | Infrastructure & DevOps | Empty apps running on K8s with full CI/CD, monitoring, secrets, and GitOps |
| **Phase 2** | App shell & standard features | Auth (Keycloak), base UI, API foundation, multi-tenancy design |
| **Phase 3+** | Business features | Haushaltsbuch first, then groceries, schedules, chores, etc. |

---

## Phase 1: Infrastructure Setup

### Why infrastructure first?

Phase 1 deliberately contains no business features. The goal is to invest in a comfortable, fully automated development environment so that future feature work is smooth and easy. Every push to main should automatically lint, test, build, deploy, and be observable — before writing a single line of business logic.

### Tech Stack

**Frontend:** Angular + Capacitor. Leverages existing Angular skills. Capacitor wraps the web app for iOS/Android. Good enough for data-entry-heavy apps.

**Backend:** NestJS + Drizzle ORM + PostgreSQL. NestJS mirrors Angular's architecture (decorators, modules, DI). Drizzle is an SQL-first, type-safe query builder — the TypeScript equivalent of spring-data-jdbc. Chosen over Prisma (too much abstraction/codegen) and TypeORM (declining, performance issues) for its simplicity, performance, and SQL transparency. Full TypeScript end-to-end reduces context switching.

**Architecture:** Modular monolith. No microservices. Clean internal module boundaries that communicate through service interfaces, not direct table access. Extract services only when there's a real reason (independent scaling, different runtime, team ownership).

### Infrastructure Choices

**Hosting: Hetzner Cloud.** Affordable German provider. Hetzner does not offer native managed Kubernetes, so we use the **kube-hetzner** community Terraform module which provisions VMs running **k3s** (lightweight, CNCF-certified Kubernetes) on openSUSE MicroOS. This is more hands-on than a managed service like GKE/EKS — which is a feature, not a bug, given the learning goal.

**Why not a managed K8s provider?** We evaluated DigitalOcean, Civo, Scaleway, and Vultr. Hetzner is 2-3x cheaper for the same workload (~€22/month vs. ~$60-80/month). The extra operational learning from self-managed k3s aligns with project goals. The k3s API is identical to standard Kubernetes — all Helm charts, ArgoCD, monitoring work exactly the same.

**Cluster sizing: ARM nodes.** 1 control plane + 3 worker nodes, all Hetzner CAX11 (ARM-based, 2 vCPU, 4 GB RAM each). ARM instances are cheaper than x86. Most Docker images (nginx, node, postgres, prometheus, grafana) have ARM builds. Multi-platform Docker builds (amd64 + arm64) ensure images work everywhere.

**Budget: ~€35/month.** Hetzner prices increased ~30-37% on April 1, 2026 (DRAM costs). Post-increase compute costs ~€26/month, plus Object Storage (€6.49/month base) for backups.

**Infrastructure as Code: Terraform.** Separate state files per lifecycle boundary (cluster vs. database vs. app infra). Stateful resources isolated from stateless ones to prevent accidental data loss. Local state initially, remote backend later.

**Ingress: Traefik (bundled by kube-hetzner).** The Kubernetes community project ingress-nginx was retired in March 2026 (EOL, no further patches). Traefik is the recommended replacement and is kube-hetzner's default ingress controller — properly integrated with Hetzner load balancers. No separate ingress controller installation needed. Standard Kubernetes Ingress resources work with Traefik. Migration to Kubernetes Gateway API (the official successor to Ingress resources) is a Phase 2+ learning target.

**GitOps: ArgoCD (app-of-apps).** Watches the Git repo and syncs cluster state automatically. CI pipeline never needs cluster credentials — it only writes to Git. Every deployment is a Git commit. Rollbacks = `git revert`. ArgoCD manages ALL services — both applications and cluster services (cert-manager, Infisical, monitoring). Only ArgoCD itself is bootstrapped with a manual `helm install`; after that, everything is managed through ArgoCD Application manifests committed to Git. This is the app-of-apps pattern.

**CI/CD: GitHub Actions.** On push to main: lint → test → build multi-platform Docker images → push to GHCR → update image tag in deploy folder → ArgoCD syncs. PR branches: lint and test only. Uses built-in `GITHUB_TOKEN` for GHCR.

**Secrets management: Infisical (self-hosted).** Deployed on K8s via Helm. Open source (MIT core). Has its own Kubernetes Operator that syncs secrets into K8s Secrets. Web UI for managing secrets. Chose over Sealed Secrets (less learning value), OpenBao/Vault (unsealing complexity on Hetzner without cloud KMS), and External Secrets Operator (ESO resumed development in early 2026 after a pause, but Infisical's richer feature set and web UI provide more learning value).

**Monitoring: Phased approach.** Phase 1 deploys Prometheus + Grafana for infrastructure monitoring only (cluster health, node/pod resources, K8s dashboards). App-level observability is Phase 2: OpenTelemetry SDK in NestJS (single instrumentation for metrics, traces, and logs) → OTel Collector → Prometheus (metrics), Tempo (traces), Loki (logs). Deploying the full LGTM stack in Phase 1 is too much to absorb alongside K8s, Terraform, and ArgoCD, and there's no app logic to observe yet.

**Database: PostgreSQL.** Self-hosted on K8s via CloudNativePG (or similar Helm chart). Hetzner does not offer a managed PostgreSQL service. Automated daily backups via K8s CronJob to Hetzner Object Storage.

### Local Development

Docker Compose provides PostgreSQL (and Redis if needed later) for local development. The frontend and backend run natively via `nx serve` for hot reload — they are NOT containerized locally. The same Dockerfiles are used only for CI and production builds. This keeps the local dev loop fast while ensuring production parity where it matters (the container image).

### Database Schema Strategy

One PostgreSQL server instance as shared platform infrastructure. The logical database and schema are owned by the API and managed through Drizzle migrations. Within PostgreSQL, separate schemas per module provide a pragmatic middle ground for isolation without the overhead of separate databases. If a service is ever extracted: evaluate per case — shared read-only access, API calls, or separate database depending on domain overlap.

### Environments

Phase 1 runs production only. No staging environment — there's nothing to meaningfully test yet and no users to protect. A staging namespace gets added later when there are real features and users to justify it.

### Namespace Strategy

Each platform service gets its own Kubernetes namespace for isolation: `hearthly` for application workloads, `traefik` (managed by kube-hetzner), `argocd`, `cert-manager`, `infisical`, and `monitoring` for their respective services. This follows the Kubernetes convention of separating concerns and makes it easy to apply resource quotas or RBAC per namespace later.

### Repo Structure

Single GitHub monorepo managed with Nx. App-specific infrastructure lives with the app (`/apps/xxx/infra/`). Shared platform infrastructure lives in `/infrastructure/`. Each Terraform directory has a separate state file. Helm charts are independent per app.

### What Phase 1 delivers

At the end of Phase 1, we have:
- An Nx monorepo with default Angular and NestJS apps (no features)
- Dockerfiles producing multi-platform images
- A running k3s cluster on Hetzner with 3 ARM worker nodes
- ArgoCD syncing deployments from Git
- GitHub Actions CI/CD building and deploying on every push
- Traefik ingress (bundled by kube-hetzner) with TLS via cert-manager + Let's Encrypt
- Secrets managed through Infisical with K8s operator sync
- Prometheus + Grafana monitoring with basic dashboards
- Automated database backups
- Default apps accessible via domain over HTTPS

### What Phase 1 does NOT deliver

- No business features (no budget tracking, no transactions)
- No authentication (Keycloak comes in Phase 2)
- No staging environment (added when there are real features and users)
- No log aggregation or distributed tracing (added when meaningful)

---

## Phase 2 Preview: App Shell

Planned separately after Phase 1. Key topics:
- Keycloak deployment on K8s for authentication
- OIDC integration in NestJS and Angular
- Family/household data model and multi-tenancy strategy
- Base UI layout (navigation, routing, theme)
- API design decisions (REST vs. tRPC vs. GraphQL)
- Kubernetes Gateway API migration (HTTPRoute replacing Ingress resources)
- NetworkPolicy and RBAC

## Phase 3+ Preview: Business Features

- Haushaltsbuch (household budget tracker) — first feature
- Transaction management, categories, budgets, reports
- Family member management
- Additional modules (groceries, schedules, chores, etc.)
- Kids features (later expansion)

---

## Decided Items (from planning)

- **Domain:** `hearthly.dev` via Cloudflare Registrar. Nameservers → Hetzner DNS.
- **Infisical database:** Bundled PostgreSQL (isolated from app DB, Helm chart manages lifecycle).
- **Terraform remote backend:** Set up in Task 7 using Hetzner Object Storage (S3-compatible, already paid for via backups budget).
