# Hearthly — Project Instructions

## Project Overview

Family management app. Phase 1 (infrastructure) is complete — see `tasks/phase-1-record.md` for architecture decisions and implementation log. Phase 2 backlog at `tasks/phase-2/backlog.md`.

**Domain:** hearthly.dev

## Environment

- **Runtime:** Node.js 24 LTS (Krypton) via nvm
- **Package manager:** npm 11
- **Monorepo:** Nx (use `npx nx` — not installed globally)
- **Data access:** Drizzle ORM (SQL-first, type-safe query builder)
- **Containers:** Docker 28 + Docker Buildx (multi-platform: amd64 + arm64)
- **Infrastructure:** Terraform 1.13, hcloud CLI 1.62, Packer 1.12
- **Kubernetes:** kubectl 1.34, Helm 3.17, ArgoCD CLI 3.3
- **Git hosting:** GitHub (gh CLI 2.88), private repo
- **CI/CD:** GitHub Actions → GHCR → ArgoCD

## Architecture

- **Frontend:** Angular + Capacitor
- **Backend:** NestJS + Drizzle ORM + PostgreSQL
- **Infrastructure:** Hetzner Cloud, k3s via kube-hetzner, ARM nodes (CAX11)
- **Ingress:** Traefik (bundled by kube-hetzner)
- **GitOps:** ArgoCD 3.x, app-of-apps pattern
- **Secrets:** Infisical (self-hosted, K8s operator)
- **Monitoring:** Prometheus + Grafana
- **Database:** CloudNativePG (self-hosted PostgreSQL)

## Cluster

- **Location:** nbg1 (Nuremberg) — fsn1 had CAX11 capacity issues
- **Nodes:** 1x CAX11 control plane + 3x CAX11 workers (ARM, 4 GB each)
- **k3s:** v1.34.5 (stable channel, auto-upgrades enabled)
- **Traefik LB IP:** 46.225.42.23 (IPv4), 2a01:4f8:1c1f:72d7::1 (IPv6)
- **Module:** kube-hetzner v2.18.5, hcloud provider v1.60.1
- **Terraform state:** Hetzner Object Storage (S3 backend, bucket: hearthly-tfstate)
- **Bundled services:** Traefik, cert-manager, hcloud CSI/CCM, metrics-server, kured
- **DNS:** Cloudflare (registrar locks NS, can't use Hetzner DNS). A records: @, api, argocd, grafana, secrets → LB IP. DNS only (no proxy).

## ArgoCD

- **Version:** v3.3.6 (Helm chart v9.4.17)
- **UI:** argocd.hearthly.dev (or `kubectl port-forward svc/argocd-server -n argocd 8080:443`)
- **Admin password:** `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`
- **Repo access:** HTTPS + GitHub token (SSH blocked by Hetzner firewall outbound). Token in K8s Secret `hearthly-repo` in argocd namespace.
- **Applications:** hearthly-api, hearthly-app (auto-sync, self-heal), argocd (self-managing)
- **Firewall note:** Hetzner firewall blocks outbound SSH (port 22). Only 80, 443, 53, 123 allowed outbound.

## Database (Production)

- **Operator:** CloudNativePG v1.28.1 (namespace: cnpg-system)
- **Cluster:** hearthly-db in hearthly namespace, PostgreSQL 18.1 on ARM64
- **Storage:** 10Gi Hetzner Volume (hcloud-volumes StorageClass)
- **Services:** hearthly-db-rw (primary), hearthly-db-ro (replicas), hearthly-db-r (any)
- **Credentials:** Auto-generated in K8s Secret `hearthly-db-app`
- **Connection URI:** `kubectl get secret hearthly-db-app -n hearthly -o jsonpath='{.data.uri}' | base64 -d`
- **API wiring:** DATABASE_URL injected into API pods from `hearthly-db-app` secret
- **PV reclaim policy:** Retain (prevents accidental data loss)
- **Backups:** Daily pg_dump (custom format) CronJob at 02:00 UTC → Hetzner Object Storage (`hearthly-backups` bucket). S3 lifecycle policy handles 30-day retention. SHA256 checksums uploaded alongside each backup. S3 credentials from Infisical.
- **Restore:** `aws s3 cp s3://hearthly-backups/<filename>.dump . --endpoint-url https://nbg1.your-objectstorage.com --region nbg1 && pg_restore -d "$(kubectl get secret hearthly-db-app -n hearthly -o jsonpath='{.data.uri}' | base64 -d)" <filename>.dump`
- **Verify checksum:** `aws s3 cp s3://hearthly-backups/<filename>.dump.sha256 . --endpoint-url https://nbg1.your-objectstorage.com --region nbg1 && sha256sum -c <filename>.dump.sha256`

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

# Drizzle
npx drizzle-kit generate         # Generate migration from schema changes
npx drizzle-kit migrate          # Apply migrations
npx drizzle-kit studio           # Visual database browser

# Docker (multi-platform)
docker buildx build --platform linux/amd64,linux/arm64 -f apps/hearthly-api/deploy/Dockerfile -t hearthly-api .
docker buildx build --platform linux/amd64,linux/arm64 -f apps/hearthly-app/deploy/Dockerfile -t hearthly-app .

# Infrastructure (requires TF_VAR_hcloud_token env var)
cd infrastructure/cluster && terraform init -backend-config=backend.conf
cd infrastructure/cluster && terraform plan
cd infrastructure/cluster && terraform apply

# Kubernetes
export KUBECONFIG=~/.kube/config    # Written by: terraform output -raw kubeconfig > ~/.kube/config
kubectl get nodes                    # Verify cluster
kubectl get pods -A                  # All pods across namespaces
```

## Code Conventions

- Full TypeScript end-to-end
- Modular monolith: modules communicate via service interfaces, not direct DB access
- Helm charts per app in `/apps/xxx/deploy/chart/` with `_helpers.tpl` and standard `app.kubernetes.io/*` labels
- App-specific infra in `/apps/xxx/infra/`
- Shared platform infra in `/infrastructure/`
- Separate Terraform state per directory
- All cluster services managed via ArgoCD (except ArgoCD itself)
- Security contexts on all deployments (runAsNonRoot, drop ALL capabilities, seccomp RuntimeDefault)
- X-Powered-By disabled on API
- Trivy scans in CI with `exit-code: 1` and `ignore-unfixed: true`
- Phase 2 backlog at `tasks/phase-2/backlog.md`

## Key Versions to Pin

- kube-hetzner: >= v2.18.1 (v2.18.0 broken)
- hcloud provider: >= v1.58.0 (DNS support, datacenter deprecation)
- ArgoCD Helm chart: >= v9.4 (3.x series)
- Drizzle ORM: SQL-first, schema in TypeScript, migrations via drizzle-kit

## Known Issues

- **WSL2 + kube-hetzner CRLF:** Terraform module files download with CRLF line endings on WSL2, breaking heredoc provisioners. Fix: `find .terraform/modules/kube-hetzner -name "*.tf" -exec sed -i 's/\r$//' {} +` (also .sh, .yaml, .tpl). Must re-run after `terraform init` downloads modules.
- **Traefik chart v34+ schema:** kube-hetzner v2.18.x generates deprecated Traefik Helm values (`globalArguments`, `ports.web.redirections`). Fix applied via `traefik_values` override in main.tf. If Traefik install fails after a fresh apply, patch the HelmChart resource in-cluster.
- **Hetzner firewall blocks outbound SSH:** ArgoCD cannot use SSH Git access. Use HTTPS + token instead. If other services need outbound SSH, add `extra_firewall_rules` in Terraform main.tf.
