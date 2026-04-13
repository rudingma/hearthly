# Hearthly — Project Summary

## Vision

Hearthly is a family management app. It starts as a Haushaltsbuch (household budget tracker) and grows into a full family operating system — finances, groceries, schedules, chores, school, medical appointments. First for parents, later expanding for kids.

**Domain:** hearthly.dev

## Goals

1. **Learning** — Hands-on experience with Kubernetes, Terraform, GitOps, observability, and secrets management. The infrastructure complexity is intentional.
2. **Building a real product** — A family app that will grow milestone by milestone.

**Development philosophy:** AI-first. Claude Code implements ~99% of the app. The developer focuses on planning and decisions.

**Work tracking:** GitHub Issues + GitHub Projects kanban board. Feature work is grouped into milestones (naturally sized, each with a clear deliverable). Infrastructure and bugs are standalone issues. No sprints, no story points — work top to bottom.

## Milestones

| Milestone | Focus | Status |
|---|---|---|
| **Project Setup & Infrastructure** | Cluster, CI/CD, GitOps, secrets, monitoring, backups | Complete |
| **Data Layer Foundation** | Drizzle module, repository pattern, transactions, test infra | Next |
| **Authentication** | Keycloak, OIDC in NestJS + Angular | Planned |
| **App Shell** | Angular layout, navigation, routing, theming | Planned |
| **Family & Household Model** | Data model, multi-tenancy | Planned |
| **Observability** | OpenTelemetry, Tempo, Loki, app dashboards | Planned |
| *Future* | Business features (budget, groceries, schedules) | — |

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Angular + Ionic + Capacitor | Existing Angular skills. Ionic for mobile-first UI components (tabs, gestures, split-pane). Capacitor wraps web for iOS/Android. |
| Backend | NestJS + Drizzle ORM | NestJS mirrors Angular (decorators, modules, DI). Drizzle is SQL-first, type-safe — chosen over Prisma (too much abstraction) and TypeORM (declining). |
| Database | PostgreSQL (CloudNativePG) | Self-hosted on K8s. Hetzner has no managed database. |
| Architecture | Modular monolith | No microservices. Clean module boundaries via service interfaces. Extract only when there's a real reason. |
| Hosting | Hetzner Cloud (k3s) | 2-3x cheaper than DigitalOcean/Civo/Scaleway. Self-managed k3s via kube-hetzner Terraform module. |
| Nodes | ARM (CAX11) | Cheaper than x86. 1 CP + 3 workers, 4GB each. ~€32/month total. |
| Ingress | Traefik | Bundled by kube-hetzner. ingress-nginx retired March 2026. Gateway API migration planned (see GitHub Issues). |
| GitOps | ArgoCD (app-of-apps) | Everything deployed via Git commits. CI never needs cluster credentials. |
| CI/CD | GitHub Actions → GHCR | PR: lint+test. Push to main: build → push → ArgoCD syncs. ARM-only builds (cluster is ARM-only). |
| Secrets | Infisical (self-hosted) | Chosen over Sealed Secrets (less learning value), Vault (unsealing complexity without cloud KMS), ESO (less mature UI). |
| Monitoring | Prometheus + Grafana | Infrastructure monitoring live. App-level observability (OpenTelemetry) tracked in Observability milestone. |
| Backups | pg_dump CronJob → S3 | Daily, custom format, SHA256 checksums, 30-day S3 lifecycle policy. |

## Key Decisions

Non-obvious choices and their rationale. Updated as decisions are made.

### Hetzner trade-offs

Hetzner is the cheapest EU provider for this workload but has real limitations:
- **No CSI VolumeSnapshots** — blocks CNPG native backups and Velero. No fix expected soon (open since Jan 2025).
- **S3 restore bug with barman** — backups succeed but restores fail (byte-count mismatch). Barman team closed as "not planned."
- **Firewall blocks outbound SSH** — ArgoCD must use HTTPS + GitHub token instead of SSH.

If budget grows to ~€55/month, IONOS is the migration target (managed K8s, working VolumeSnapshots, cheap S3).

### pg_dump over CNPG native backups

CloudNativePG has built-in backup via the Barman Cloud Plugin, which provides point-in-time recovery (PITR). We evaluated it thoroughly and chose pg_dump instead because:
- The Barman Cloud Plugin is pre-1.0 (v0.11.0) with active memory leak and resource consumption issues
- Hetzner S3 has a documented restore byte-count mismatch bug — backups work but restores can fail
- The deprecated in-tree barmanObjectStore has the same Hetzner bug
- pg_dump + aws-cli uses simple S3 PUT, avoiding barman's problematic restore path
- PITR has no value with an empty database and no users

**Revisit when:** plugin reaches 1.0, Hetzner S3 restore bug is fixed, or real users exist.

### Infra monitoring only (initial setup)

The Project Setup & Infrastructure milestone deployed Prometheus + Grafana for cluster health. App-level observability (request metrics, traces, logs) deferred because:
- No app logic to observe yet
- OpenTelemetry SDK + Collector + Tempo + Loki is too much to absorb alongside K8s/Terraform/ArgoCD
- Significant resource footprint on small nodes

**Observability milestone approach:** OpenTelemetry SDK in NestJS (single instrumentation) → OTel Collector → Prometheus (metrics), Tempo (traces), Loki (logs).

### Custom Grafana dashboard over bundled

kube-prometheus-stack ships 23 generic dashboards. Replaced with 1 custom "Hearthly Cluster Health" dashboard designed from SRE first principles:
- Emergency row answers "is something broken?" in 2 seconds (OOMKills, CrashLoops, node readiness, failed backups)
- Saturation signals predict problems before outages (CPU throttling, memory-vs-limit)
- Node rootfs disk monitoring (not just PVCs) — disk full triggers pod eviction

### Admission webhooks via cert-manager

kube-prometheus-stack admission webhooks validate PrometheusRule and AlertmanagerConfig CRDs at apply time (catches PromQL syntax errors). The default patch-Job approach was incompatible with ArgoCD (Helm hooks block PreSync). Resolved by using the chart's cert-manager integration (`certManager.enabled: true`) — cert-manager issues the webhook TLS cert and auto-injects the CA bundle, with no Helm hooks involved. Three k3s-specific overrides were needed to make the API server actually reach the webhook: move the operator off the kubelet port (`tls.internalPort: 8443`), lower the TLS minimum (`tls.tlsMinVersion: VersionTLS12`), and allow webhook ingress from any source IP (the k3s API server's source IP for webhook calls is not stable enough to target with an `ipBlock`).

### ArgoCD controller memory (2Gi)

kube-prometheus-stack generates ~80 CRDs + many PrometheusRules and ServiceMonitors. The ArgoCD controller OOMs at 1Gi diffing these resources. 2Gi is the minimum for this monitoring stack.

### No staging environment

Production only. No staging until there are real features and users to justify the resource cost. CI free tier (2,000 min/month) has sufficient headroom for direct-to-main workflow. A staging namespace is trivial to add later.

### Database schema strategy

One PostgreSQL instance, separate schemas per module via Drizzle migrations. If a service is ever extracted: evaluate per case (shared read-only access, API calls, or separate database depending on domain overlap).
