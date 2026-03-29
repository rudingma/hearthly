# Hearthly — Phase 1: Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Context:** Read `project-summary.md` in this folder for architecture decisions, reasoning, and tech stack rationale.

**Goal:** From empty repo to default apps running on Kubernetes with full CI/CD, secrets management, and monitoring.

**Tech Stack:** Angular, NestJS, Drizzle, PostgreSQL, k3s (Hetzner/kube-hetzner), Terraform, ArgoCD 3.x, GitHub Actions, GHCR, Traefik (bundled), Infisical, Prometheus, Grafana, cert-manager

---

## Progress

| Task | Status | Notes |
|---|---|---|
| 0: Git init | Done | Repo: github.com/rudingma/hearthly (private) |
| 1: Local tooling | Done | Node 24 LTS, all CLIs installed. CLAUDE.md committed. |
| 2: MCP setup | Skipped | CLI access (gh, hcloud, kubectl, helm, argocd, terraform) covers all needs. Revisit K8s MCP after Task 7 if needed. |
| 3: Nx monorepo scaffold | Done | hearthly-api (NestJS 11 + /health) + hearthly-app (Angular 21, SCSS). Renamed from hearthly-web. Shared lib deferred. Review fixes: .gitattributes (LF), jest.preset.js, removed nx-welcome + @nestjs/axios, added paths:{} to tsconfig. NX_IGNORE_UNSUPPORTED_TS_SETUP=true needed for Angular builds. |
| 4: Docker Compose + Drizzle | Done | PostgreSQL 18 on port 5434 (5432 taken by other projects). Drizzle ORM replaces Prisma (SQL-first, type-safe). Initial schema + migration applied. |
| 5: Dockerfiles | Done | Multi-stage: API (node:24-alpine, nx prune, non-root, /api/health check, 335MB) + App (node:24-alpine builder, nginxinc/nginx-unprivileged, SPA routing, security headers, 82MB). .dockerignore excludes tests/infra/docs. Workspace package.json files must be copied before npm ci (npm workspaces). Buildx supports amd64+arm64. Code-reviewed by Opus 4.6 subagent — fixed: nginx security headers, non-root nginx, source map stripping, npm cache cleanup, OCI labels. |
| 6: Hetzner account | Done | Account created, project `hearthly`, hcloud context active. CAX11 ARM nodes available in fsn1/nbg1/hel1. |
| 7: Terraform k3s cluster | Done | kube-hetzner v2.18.5, k3s v1.34.5, 1 CP + 3 workers (CAX11 ARM) in nbg1. Traefik LB: 138.199.135.103. Fixed: Traefik chart v34+ schema (globalArguments removed, redirections→http.redirections), CRLF→LF for kube-hetzner on WSL2, fsn1→nbg1 (CAX11 unavailable in fsn1). MicroOS snapshots via Packer. Remote state on Hetzner Object Storage (S3 backend). Smoke test passed. cert-manager bundled by module. |
| 8-17 | Not started | |

---

## Quick Reference

**Cluster:** 1x CAX11 control plane + 3x CAX11 workers (ARM, 4 GB each) — ~€26/month (post-April 2026 prices)

**Namespaces:** `hearthly` (apps), `traefik` (bundled by kube-hetzner), `argocd`, `cert-manager`, `infisical`, `monitoring`

**Repo structure:**
```
/apps/hearthly-api/{src, deploy/Dockerfile, deploy/chart/, infra/}
/apps/hearthly-app/{src, deploy/Dockerfile, deploy/chart/, infra/}
/infrastructure/{cluster/, cluster-services/{argocd,cert-manager,infisical,monitoring}/}
/.github/workflows/
```

**Classification:** AI = Claude writes config/code | CLI = Claude runs via bash | MANUAL = user performs

**GitOps model:** Only ArgoCD is installed via direct `helm install` (one-time bootstrap). All other cluster services (cert-manager, Infisical, monitoring) are deployed as ArgoCD Application manifests committed to Git. This is the app-of-apps pattern.

**Resource budget (3 workers × 4 GB = 12 GB total):**

| Service | Memory request (est.) | Notes |
|---|---|---|
| k3s system overhead (3 nodes) | ~1.5 GB | ~500 MB per node |
| Traefik (bundled) | ~128 MB | Already running after Task 7 |
| ArgoCD 3.x | ~512 MB | API server, controller, repo-server, Redis |
| Prometheus + Grafana | ~768 MB | Prometheus ~500 MB, Grafana ~256 MB, exporters |
| cert-manager | ~64 MB | |
| Infisical (1 replica) + PG + Redis | ~734 MB | App ~350 MB, PG ~256 MB, Redis ~128 MB |
| Infisical Operator | ~64 MB | |
| App PostgreSQL (CloudNativePG) | ~256 MB | |
| hearthly-api + hearthly-app | ~160 MB | API ~128 MB, nginx ~32 MB |
| **Total requests** | **~4.2 GB** | **~7.8 GB headroom** — comfortable for Phase 1 |

---

## Dependency Graph

```
Task 0: Git init + .gitignore
Task 1: Local tooling
Task 2: MCP setup for AI access
    |
    ├── Tasks 3+4 (sequential): Nx monorepo → Drizzle setup
    ├── Task 5 (parallel with 3+4): Dockerfiles
    └── Task 6 (parallel, manual): Hetzner account setup
            |
        Task 7: Terraform — k3s cluster (kube-hetzner) + smoke test
            |
    ┌───────┴──────────────┐
    |                      |
  Task 10                Tasks 8-9 (parallel)
  Helm charts            Terraform: DB + DNS
    |
  Task 11
  ArgoCD bootstrap (+ app-of-apps for cluster services)
    |
  Task 12: CI/CD pipelines
    |
    ├── Task 13: cert-manager + TLS (ArgoCD App, needs DNS from Task 9)
    └── Task 14: Infisical (ArgoCD App, parallel with 13)
            |
    ────────┴──────────
            |
      Task 15: Monitoring (ArgoCD App)
            |
      Task 16: Database backups
            |
      Task 17: Deploy & verify end-to-end
```

**Key dependencies:** Task 4 (Drizzle) depends on Task 3 (Nx scaffold). Task 10 before 11. Task 12 does NOT need Tasks 8-9. Task 13 needs DNS (Task 9). Tasks 13 and 14 are parallel. Traefik is bundled by kube-hetzner in Task 7 — no separate ingress install needed.

---

## Task Breakdown

### Task 0: Git Repository Initialization

**Classification:** CLI

- [ ] **Step 1:** `git init`
- [ ] **Step 2:** Create `.gitignore` (node_modules, dist, .angular, .env, .terraform, *.tfstate, *.tfvars, kubeconfig*, .idea, .vscode, .DS_Store, .nx)
- [ ] **Step 3:** Initial commit
- [ ] **Step 4:** Create GitHub repo (MANUAL or `gh repo create hearthly --private --source=. --push`)

---

### Task 1: Local Tooling Installation & Verification

**Classification:** CLI + MANUAL

Install latest stable versions of all tools. Check current docs at implementation time.

- [ ] **Step 1:** Verify Node.js (>= 20 LTS) and npm
- [ ] **Step 2:** Install global CLI tools: `npm install -g nx@latest`
- [ ] **Step 3:** Install infra CLI tools (hcloud, kubectl, helm, terraform, argocd >= 3.x)
- [ ] **Step 4:** Verify all tools and print versions
- [ ] **Step 5:** Create `CLAUDE.md` with tool versions and project conventions, commit

---

### Task 2: MCP Setup for AI-First Development

**Classification:** AI + MANUAL

- [ ] **Step 1:** Inventory available MCP servers (GitHub, Kubernetes, Terraform)
- [ ] **Step 2:** Configure additional MCP servers as needed
- [ ] **Step 3:** Document AI-accessible vs. manual-only systems

---

### Task 3: Nx Monorepo Scaffold

**Classification:** CLI

**Creates:** `/apps/hearthly-api/`, `/apps/hearthly-app/`

Renamed from `hearthly-web` → `hearthly-app` because Capacitor produces web + iOS + Android from the same codebase. Shared library (`/libs/shared/`) deferred — nothing to share until Phase 2 features.

- [ ] **Step 1:** Check current Nx docs for workspace creation (preset syntax changes between versions)
- [ ] **Step 2:** Add Nx plugins: `nx add @nx/angular` and `nx add @nx/nest`
- [ ] **Step 3:** Generate NestJS app: `nx g @nx/nest:application hearthly-api`
- [ ] **Step 4:** Generate Angular app: `nx g @nx/angular:application hearthly-app`
- [ ] **Step 5:** Add health check endpoint to hearthly-api (install `@nestjs/terminus`, implement `/health`)
- [ ] **Step 6:** Verify both apps start locally
- [ ] **Step 7:** Commit

---

### Task 4: Docker Compose + Drizzle for Local Development

**Classification:** AI | **Depends on:** Task 3 (NestJS app must exist for Drizzle)

**Creates:** `/docker-compose.yml`, `/.env.example`, Drizzle schema

- [ ] **Step 1:** Create `docker-compose.yml` with PostgreSQL 16 (persistent volume, health check)
- [ ] **Step 2:** Create `.env.example` with default credentials
- [ ] **Step 3:** Verify PostgreSQL starts: `docker compose up -d && docker compose exec postgres pg_isready`
- [ ] **Step 4:** Configure Drizzle ORM in hearthly-api — install `drizzle-orm` + `postgres` driver + `drizzle-kit` (dev), create schema and drizzle config
- [ ] **Step 5:** Run initial migration: `npx drizzle-kit generate` then `npx drizzle-kit migrate`
- [ ] **Step 6:** Commit

---

### Task 5: Dockerfiles for Both Apps

**Classification:** AI

**Creates:** `/apps/hearthly-api/deploy/Dockerfile`, `/apps/hearthly-app/deploy/Dockerfile`

- [ ] **Step 1:** Multi-stage Dockerfile for API (node-alpine, non-root user, health check)
- [ ] **Step 2:** Multi-stage Dockerfile for web (nginx-alpine)
- [ ] **Step 3:** Build multi-platform (amd64 + arm64) with `docker buildx build --platform linux/amd64,linux/arm64`. Note: if CI times become a problem, building arm64-only is acceptable since the cluster is ARM-only.
- [ ] **Step 4:** Verify containers start and respond
- [ ] **Step 5:** Commit

---

### Task 6: Hetzner Account & hcloud Setup

**Classification:** MANUAL

- [ ] **Step 1:** Create Hetzner Cloud account
- [ ] **Step 2:** Create project in Hetzner Console
- [ ] **Step 3:** Generate API token (read/write)
- [ ] **Step 4:** `hcloud context create hearthly`
- [ ] **Step 5:** Verify: `hcloud server-type list`

---

### Task 7: Terraform — k3s Cluster (kube-hetzner)

**Classification:** AI + CLI

**Creates:** `/infrastructure/cluster/{main.tf, variables.tf, outputs.tf, terraform.tfvars.example}`

Uses `kube-hetzner/terraform-hcloud-kube-hetzner` module **>= v2.18.1** (v2.18.0 is broken). k3s on openSUSE MicroOS. Includes Cloud Controller Manager, CSI driver, load balancer integration, and **Traefik as the default ingress controller**.

- [ ] **Step 1:** Research latest kube-hetzner docs and required variables
- [ ] **Step 2:** Create Terraform config — 1x CAX11 control plane + 3x CAX11 workers (ARM), private network, CSI enabled, Traefik enabled (default). Pin kube-hetzner >= v2.18.1. Use `hetznercloud/hcloud` provider >= v1.58.0.
- [ ] **Step 3:** `terraform init && terraform plan` — review carefully (creates VMs that cost money)
- [ ] **Step 4:** `terraform apply` (user approves)
- [ ] **Step 5:** Retrieve kubeconfig: `terraform output -raw kubeconfig > ~/.kube/config && chmod 600 ~/.kube/config`
- [ ] **Step 6:** Verify: `kubectl get nodes` (all Ready), `kubectl get pods -A` (system pods + Traefik running)
- [ ] **Step 7:** Smoke test: deploy nginx, curl it from within cluster, clean up
- [ ] **Step 8:** Verify PersistentVolume support: `kubectl get storageclass` (hcloud-volumes default)
- [ ] **Step 9:** Set up Terraform remote backend on Hetzner Object Storage (S3-compatible). Create bucket via `hcloud`, configure `backend "s3"` in Terraform, migrate state with `terraform init -migrate-state`. This protects against local state loss for cost-bearing resources.
- [ ] **Step 10:** Commit

---

### Task 8: Terraform — Database Provisioning

**Classification:** AI + CLI

**Creates:** `/apps/hearthly-api/infra/{main.tf, variables.tf, outputs.tf}`

Hetzner does not offer managed PostgreSQL. Self-hosted on K8s via CloudNativePG or similar Helm chart.

- [ ] **Step 1:** Choose PostgreSQL deployment method (CloudNativePG recommended — CNCF Sandbox, declarative management)
- [ ] **Step 2:** Create Terraform config or Helm values with private networking
- [ ] **Step 3:** Deploy and verify
- [ ] **Step 4:** Verify connectivity from cluster: `kubectl run psql-test --rm -it --image=postgres:16-alpine -- psql <conn>`
- [ ] **Step 5:** Commit

---

### Task 9: Terraform — DNS

**Classification:** AI + CLI + MANUAL

**Creates:** `/apps/hearthly-app/infra/main.tf`

Use the **official `hetznercloud/hcloud` Terraform provider** for DNS (>= v1.54.0). Do NOT use the deprecated community `hetznerdns` provider. Hetzner's old DNS API (dns.hetzner.com) shuts down May 2026.

- [ ] **Step 1:** Point `hearthly.dev` nameservers to Hetzner DNS (MANUAL at Cloudflare registrar)
- [ ] **Step 2:** Terraform config using `hcloud_zone` and `hcloud_zone_rrset` resources for `hearthly.dev` A records + subdomains (api, grafana, argocd, secrets)
- [ ] **Step 3:** Apply and verify: `dig hearthly.dev`
- [ ] **Step 4:** Commit

---

### Task 10: Helm Charts for Both Apps

**Classification:** AI

**Creates:** `/apps/hearthly-api/deploy/chart/`, `/apps/hearthly-app/deploy/chart/`

- [ ] **Step 1:** Helm chart for API (Deployment, Service, health checks, resource limits, Ingress with Traefik annotations, namespace: hearthly)
- [ ] **Step 2:** Helm chart for web (Deployment, Service for nginx, Ingress with Traefik annotations, namespace: hearthly)
- [ ] **Step 3:** Lint both charts
- [ ] **Step 4:** Dry-run template rendering
- [ ] **Step 5:** Commit

---

### Task 11: ArgoCD Bootstrap & App-of-Apps

**Classification:** AI + CLI | **Depends on:** Task 10

**Creates:** `/infrastructure/cluster-services/argocd/{values.yaml, apps/*.yaml}`

ArgoCD 3.x (Helm chart >= v9.4). This is the ONLY direct `helm install` in the entire setup. All other services are deployed as ArgoCD Applications.

- [ ] **Step 1:** Create ArgoCD Helm values (Traefik IngressRoute for UI, resource limits, repo config)
- [ ] **Step 2:** Configure private repo access — add GitHub credentials (SSH key, HTTPS token, or GitHub App) for ArgoCD to read the private repo
- [ ] **Step 3:** Install: `helm repo add argo https://argoproj.github.io/argo-helm && helm install argocd argo/argo-cd -n argocd --create-namespace -f values.yaml`
- [ ] **Step 4:** Create Application manifests for both apps (auto-sync, self-heal, namespace: hearthly)
- [ ] **Step 5:** Create ArgoCD Application manifests for cluster services:
  - `cert-manager.yaml` → points to `/infrastructure/cluster-services/cert-manager/`
  - `infisical.yaml` → points to `/infrastructure/cluster-services/infisical/`
  - `monitoring.yaml` → points to `/infrastructure/cluster-services/monitoring/`
- [ ] **Step 6:** Create self-managing ArgoCD Application
- [ ] **Step 7:** Verify UI via port-forward, get admin password
- [ ] **Step 8:** Verify all apps visible: `argocd app list`
- [ ] **Step 9:** Commit

---

### Task 12: GitHub Actions CI/CD

**Classification:** AI + MANUAL

**Creates:** `/.github/workflows/{ci.yml, deploy.yml}`

- [ ] **Step 1:** CI workflow (PR → lint + test, Nx affected)
- [ ] **Step 2:** Deploy workflow:
  - Trigger: push to main
  - Jobs: lint → test → build multi-platform images (`docker/build-push-action` with `platforms: linux/amd64,linux/arm64`) → push GHCR
  - Image tag update: use `yq` or `sed` to update image tags in Helm `values.yaml`, commit with `GITHUB_TOKEN`
  - Permissions needed: `packages: write` (GHCR) + `contents: write` (tag commit)
  - Note: commits made with `GITHUB_TOKEN` won't trigger subsequent workflows (GitHub's loop protection) — this is desirable for GitOps
- [ ] **Step 3:** Configure additional GitHub secrets if needed
- [ ] **Step 4:** Test CI with dummy PR
- [ ] **Step 5:** Test deploy with push to main, verify ArgoCD syncs
- [ ] **Step 6:** Consider enabling Nx Cloud (free tier) for computation caching — can reduce CI times 50-90% after first run
- [ ] **Step 7:** Commit

---

### Task 13: cert-manager + TLS (via ArgoCD)

**Classification:** AI | **Depends on:** Task 9 (DNS), Task 11 (ArgoCD)

**Creates:** `/infrastructure/cluster-services/cert-manager/{Chart.yaml, values.yaml, templates/}`

No separate ingress controller install — Traefik is already running from Task 7 (kube-hetzner default).

- [ ] **Step 1:** Create a Helm chart (or Kustomize) in `/infrastructure/cluster-services/cert-manager/` that installs cert-manager as a dependency + a ClusterIssuer for Let's Encrypt (HTTP01 via Traefik)
- [ ] **Step 2:** Commit and push — ArgoCD syncs the cert-manager Application from Task 11 Step 5
- [ ] **Step 3:** Verify ArgoCD shows cert-manager as Synced and Healthy
- [ ] **Step 4:** Add Ingress resources with TLS to app Helm charts (web: `<domain>`, api: `api.<domain>`)
- [ ] **Step 5:** Verify: `kubectl get certificates -A` (Ready), `curl -I https://<domain>` (valid cert)
- [ ] **Step 6:** Commit

---

### Task 14: Infisical — Secrets Management (via ArgoCD)

**Classification:** AI + CLI

**Creates:** `/infrastructure/cluster-services/infisical/{Chart.yaml, values.yaml, templates/}`

- [ ] **Step 1:** Create a Helm chart in `/infrastructure/cluster-services/infisical/` that installs `infisical-helm-charts/infisical-standalone` + the secrets-operator as dependencies. Set Infisical to 1 replica to save cluster resources. Configure Traefik IngressRoute for UI at `secrets.<domain>`.
- [ ] **Step 2:** Commit and push — ArgoCD syncs the Infisical Application from Task 11 Step 5
- [ ] **Step 3:** Verify pods running: `kubectl get pods -n infisical`
- [ ] **Step 4:** Create admin account, "hearthly" project, "production" environment, add secrets
- [ ] **Step 5:** Create InfisicalSecret CRDs to sync into `hearthly` namespace
- [ ] **Step 6:** Verify sync: `kubectl get secrets -n hearthly`, modify in UI → check update
- [ ] **Step 7:** Commit

---

### Task 15: Monitoring — Prometheus + Grafana (via ArgoCD)

**Classification:** AI

**Creates:** `/infrastructure/cluster-services/monitoring/{Chart.yaml, values.yaml, templates/}`

Loki and Tempo deferred — see summary for reasoning.

- [ ] **Step 1:** Create a Helm chart in `/infrastructure/cluster-services/monitoring/` that installs `kube-prometheus-stack` as a dependency. Configure Grafana Traefik IngressRoute at `grafana.<domain>`, retention, resource limits.
- [ ] **Step 2:** Commit and push — ArgoCD syncs the monitoring Application from Task 11 Step 5
- [ ] **Step 3:** Verify Prometheus scraping targets
- [ ] **Step 4:** Verify Grafana accessible with default K8s dashboards
- [ ] **Step 5:** Add ServiceMonitor for hearthly-api (`/metrics` endpoint)
- [ ] **Step 6:** Create initial Grafana dashboard (request rate, errors, response time, pod health)
- [ ] **Step 7:** Commit

---

### Task 16: Database Backup CronJob

**Classification:** AI + CLI

**Creates:** backup CronJob in Helm chart, Terraform for Hetzner Object Storage

- [ ] **Step 1:** Create Hetzner Object Storage bucket via Terraform
- [ ] **Step 2:** Create K8s CronJob for pg_dump (daily 02:00 UTC, compressed, 30-day retention)
- [ ] **Step 3:** Store backup credentials in Infisical, sync via operator
- [ ] **Step 4:** Test backup: `kubectl create job --from=cronjob/db-backup test-backup -n hearthly`, verify in storage
- [ ] **Step 5:** Test restore: restore backup to temporary database, verify data integrity, clean up
- [ ] **Step 6:** Commit

---

### Task 17: Deploy & Verify End-to-End

**Classification:** CLI

- [ ] **Step 1:** Push all to main, CI/CD triggers
- [ ] **Step 2:** `argocd app list` — all apps Synced and Healthy (both apps + all cluster services)
- [ ] **Step 3:** `https://<domain>` loads Angular app, `https://api.<domain>/health` responds
- [ ] **Step 4:** Both endpoints have valid Let's Encrypt certificates
- [ ] **Step 5:** Grafana shows metrics, Prometheus targets up
- [ ] **Step 6:** Secrets synced from Infisical, API connects to DB
- [ ] **Step 7:** Backup CronJob scheduled and runnable
- [ ] **Step 8:** Update README.md (architecture, URLs, how to deploy/manage secrets/monitoring)
- [ ] **Step 9:** Commit

---

## Budget Summary (post-April 1, 2026 prices)

| Resource | Monthly cost |
|---|---|
| 1x CAX11 control plane | ~€4.49 |
| 3x CAX11 worker nodes | ~€13.47 |
| Load balancer (LB11) | ~€7.49 |
| Object Storage (backups, base tier) | ~€6.49 |
| **Total** | **~€31-34** |

Within €35 budget ceiling.

---

## Open Items

- [ ] Evaluate MCP servers for Kubernetes access — Task 2

---

## Technology Versions Snapshot (March 2026)

Reference for implementation. Check current docs at task execution time.

| Technology | Version | Key notes |
|---|---|---|
| kube-hetzner | v2.18.4 | v2.18.0 broken; seeking contributors |
| k3s | release channels | Auto-upgrades via system-upgrade-controller |
| Nx | 22.6.1 | Angular 21 support in 22.3; match plugin versions to Nx version |
| Angular | 21.0.0 | esbuild default; Ionic 8 verified for Angular 20.x only (Capacitor itself is fine) |
| NestJS | 11.1.17 | SWC default compiler, Vitest default test runner — verify Nx generator aligns |
| Drizzle ORM | latest | SQL-first, type-safe; schema in TypeScript; migrations via drizzle-kit |
| Capacitor | 8.2.0 | SPM default on iOS |
| ArgoCD | 3.3.3 (chart v9.4.15) | v3.0 RBAC: policies don't cascade to sub-resources; old metrics removed |
| cert-manager | 1.20.0 | `crds.enabled=true` still valid; OCI charts now recommended |
| Traefik | 3.x (bundled) | Default ingress for kube-hetzner |
| Infisical | v0.158.20 | MIT core; K8s Operator has 3 CRDs; official docs recommend 4 GB/container but Helm defaults are ~1 GB |
| CloudNativePG | 1.28.x | CNCF Sandbox; supports declarative major upgrades |
| kube-prometheus-stack | chart v82.13.6 | Grafana sub-chart repo moved; Agent mode available for small clusters |
| hcloud provider | >= v1.58.0 | DNS since v1.54.0; `datacenter` attr removed after July 2026 |

---

## Additional Budget Notes

**Hidden costs not in main budget table:**

| Item | Estimated cost | Notes |
|---|---|---|
| IPv4 addresses (if separate) | EUR0.50/each | May add EUR2/month |
| Domain name | EUR1-5/month | .dev ~EUR1/mo at Cloudflare |

**Backup alternative:** Object Storage has a EUR6.49/month minimum. For small pg_dump backups, a Hetzner Volume (EUR0.52/10GB) is significantly cheaper (~EUR25-28/month total). Consider if budget pressure increases.

---

## Key Reference Links

- **kube-hetzner:** [GitHub](https://github.com/kube-hetzner/terraform-hcloud-kube-hetzner) | [Terraform Registry](https://registry.terraform.io/modules/kube-hetzner/kube-hetzner/hcloud/latest)
- **ArgoCD 3.x:** [Upgrade Guide 2.14→3.0](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.14-3.0/) | [Helm Chart](https://artifacthub.io/packages/helm/argo/argo-cd)
- **Drizzle ORM:** [Docs](https://orm.drizzle.team/) | [NestJS integration](https://docs.nestjs.com/recipes/drizzle) | [drizzle-kit](https://orm.drizzle.team/docs/kit-overview)
- **Hetzner DNS:** [Migration to Console](https://docs.hetzner.com/networking/dns/migration-to-hetzner-console/process/) | [Old API Shutdown](https://status.hetzner.com/incident/c2146c42-6dd2-4454-916a-19f07e0e5a44)
- **Hetzner Pricing:** [Price Adjustment Docs](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) | [Cloud Pricing](https://www.hetzner.com/cloud/pricing/)
- **cert-manager:** [Helm Install](https://cert-manager.io/docs/installation/helm/) | [Releases](https://github.com/cert-manager/cert-manager/releases)
- **CloudNativePG:** [Releases](https://cloudnative-pg.io/releases/) | [CNCF](https://www.cncf.io/projects/cloudnativepg/)
- **Infisical:** [Self-Hosting Requirements](https://infisical.com/docs/self-hosting/configuration/requirements) | [K8s Operator](https://infisical.com/docs/integrations/platforms/kubernetes/overview)
- **Gateway API (Phase 2):** [Migration Guide](https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress-nginx/) | [Ingress2Gateway 1.0](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)
- **GitOps:** [GitHub Actions + ArgoCD Guide](https://ferrishall.dev/gitops-with-github-actions-and-argo-cd)
