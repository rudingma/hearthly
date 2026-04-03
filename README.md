# Hearthly

Family management app. Phase 1 = fully automated infrastructure on Kubernetes. No business features yet.

## Architecture

```
                     Internet
                        |
                   Cloudflare DNS
                        |
              Traefik Load Balancer (46.225.42.23)
                        |
           ┌────────────┼────────────┐
           |            |            |
    hearthly.dev  api.hearthly.dev  argocd/grafana/secrets.hearthly.dev
           |            |            |
     ┌─────┘     ┌──────┘     ┌──────┘
     |           |            |
  Angular     NestJS       Admin UIs
  (nginx)     (Node.js)    (ArgoCD, Grafana, Infisical)
     |           |
     |      PostgreSQL
     |      (CloudNativePG)
     |           |
     └─────┬─────┘
           |
    k3s Cluster (Hetzner Cloud)
    1 CP + 3 Workers (ARM, 4GB each)
```

## URLs

| Service | URL | Purpose |
|---|---|---|
| Frontend | https://hearthly.dev | Angular app |
| API | https://api.hearthly.dev | NestJS backend (health: `/api/health`) |
| ArgoCD | https://argocd.hearthly.dev | GitOps deployment dashboard |
| Grafana | https://grafana.hearthly.dev | Cluster monitoring dashboard |
| Infisical | https://secrets.hearthly.dev | Secrets management UI |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 + Capacitor (future mobile) |
| Backend | NestJS 11 + Drizzle ORM |
| Database | PostgreSQL 18.1 (CloudNativePG on K8s) |
| Cluster | k3s v1.34 on Hetzner Cloud (4x CAX11 ARM) |
| Ingress | Traefik (bundled by kube-hetzner) |
| TLS | Let's Encrypt via cert-manager |
| GitOps | ArgoCD 3.x (app-of-apps pattern) |
| CI/CD | GitHub Actions → GHCR → ArgoCD auto-sync |
| Secrets | Infisical (self-hosted, K8s operator sync) |
| Monitoring | Prometheus + Grafana (kube-prometheus-stack) |
| IaC | Terraform + kube-hetzner module |
| Backups | Daily pg_dump → Hetzner Object Storage (S3) |

## Development

```bash
# Prerequisites: Node.js 24, Docker, nvm
docker compose up -d              # Local PostgreSQL
npx nx serve hearthly-api        # Backend (hot reload, port 3000)
npx nx serve hearthly-app        # Frontend (hot reload, port 4200)
```

## Deployment

Push to `main` → GitHub Actions builds Docker images → pushes to GHCR → updates image tags → ArgoCD syncs automatically.

```bash
# Check deployment status
argocd app list --server argocd.hearthly.dev --grpc-web

# Check all pods
kubectl get pods -A
```

No manual deployment steps. Everything is Git-driven.

## Secrets Management

Application secrets are managed in Infisical (https://secrets.hearthly.dev):
1. Add/edit secrets in the Infisical web UI (Production environment)
2. The K8s operator syncs them into `hearthly-managed-secrets` in the `hearthly` namespace (every 60s)
3. Pods reference the K8s Secret — no secrets in Git

Bootstrap secrets (Infisical's own ENCRYPTION_KEY, AUTH_SECRET) are in `.secrets/` (gitignored).

## Monitoring

**Grafana dashboard:** https://grafana.hearthly.dev → "Hearthly Cluster Health"

The dashboard shows:
- Emergency signals (OOMKills, CrashLoops, node readiness, failed backups)
- Per-node CPU/memory utilization
- Saturation (CPU throttling, memory vs limits)
- Disk usage (node rootfs + persistent volumes)
- Resource trends over time
- Namespace breakdown
- Prometheus self-health

Prometheus scrapes 23 targets every 30s. 10-day retention on 10Gi storage.

## Database Backups

**Schedule:** Daily at 02:00 UTC via K8s CronJob.

**Process:** `pg_dump --format=custom` → SHA256 checksum → upload to Hetzner Object Storage (`hearthly-backups` bucket). S3 lifecycle policy auto-deletes backups older than 30 days.

**Restore:**
```bash
# Download backup
aws s3 cp s3://hearthly-backups/<filename>.dump . \
  --endpoint-url https://nbg1.your-objectstorage.com --region nbg1

# Verify integrity
aws s3 cp s3://hearthly-backups/<filename>.dump.sha256 . \
  --endpoint-url https://nbg1.your-objectstorage.com --region nbg1
sha256sum -c <filename>.dump.sha256

# Restore
DB_URL=$(kubectl get secret hearthly-db-app -n hearthly -o jsonpath='{.data.uri}' | base64 -d)
pg_restore -d "$DB_URL" <filename>.dump
```

**Manual trigger:** `kubectl create job --from=cronjob/hearthly-api-db-backup manual-backup -n hearthly`

## Infrastructure

```bash
# Cluster management (requires TF_VAR_hcloud_token)
cd infrastructure/cluster
terraform init -backend-config=backend.conf
terraform plan
terraform apply

# Get kubeconfig
terraform output -raw kubeconfig > ~/.kube/config && chmod 600 ~/.kube/config
```

**Cluster:** 1x CAX11 control plane + 3x CAX11 workers (ARM, Nuremberg). ~€32/month.

**Namespaces:** `hearthly` (app), `argocd`, `infisical`, `monitoring`, `traefik`, `cert-manager`, `kube-system`, `cnpg-system`

## Project Structure

```
hearthly/
├── apps/
│   ├── hearthly-api/          # NestJS backend
│   │   ├── src/
│   │   └── deploy/
│   │       ├── Dockerfile
│   │       └── chart/         # Helm chart (incl. backup CronJob)
│   └── hearthly-app/          # Angular frontend
│       ├── src/
│       └── deploy/
│           ├── Dockerfile
│           └── chart/         # Helm chart
├── infrastructure/
│   ├── cluster/               # Terraform (kube-hetzner, k3s)
│   └── cluster-services/
│       ├── argocd/            # ArgoCD config + app-of-apps
│       ├── cert-manager/      # ClusterIssuer
│       ├── infisical/         # Infisical + secrets operator
│       └── monitoring/        # Prometheus + Grafana
├── .github/workflows/         # CI/CD pipelines
└── tasks/                     # Project plans and backlog
```

## Phase 2 (Next)

See `tasks/phase-2-backlog.md`. Key topics:
- Authentication (Keycloak)
- App observability (OpenTelemetry → Prometheus/Tempo/Loki)
- Business features (Haushaltsbuch / household budget tracker)
- Kubernetes Gateway API migration
