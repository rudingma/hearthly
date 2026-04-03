# Hearthly — Project Summary

## Vision

Hearthly is a family management app. It starts as a Haushaltsbuch (household budget tracker) and grows into a full family operating system — finances, groceries, schedules, chores, school, medical appointments. First for parents, later expanding for kids.

**Domain:** hearthly.dev

## Goals

1. **Learning** — Hands-on experience with Kubernetes, Terraform, GitOps, observability, and secrets management. The infrastructure complexity is intentional.
2. **Building a real product** — A family app that will grow over multiple phases.

**Development philosophy:** AI-first. Claude Code implements ~99% of the app. The developer focuses on planning and decisions.

## Phases

| Phase | Focus | Status |
|---|---|---|
| **Phase 1** | Infrastructure & DevOps | Complete |
| **Phase 2** | Auth, app shell, first features | Next |
| **Phase 3+** | Business features (budget, groceries, schedules) | Future |

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Angular + Capacitor | Existing Angular skills. Capacitor wraps web for iOS/Android. |
| Backend | NestJS + Drizzle ORM | NestJS mirrors Angular (decorators, modules, DI). Drizzle is SQL-first, type-safe — chosen over Prisma (too much abstraction) and TypeORM (declining). |
| Database | PostgreSQL (CloudNativePG) | Self-hosted on K8s. Hetzner has no managed database. |
| Architecture | Modular monolith | No microservices. Clean module boundaries via service interfaces. Extract only when there's a real reason. |
| Hosting | Hetzner Cloud (k3s) | 2-3x cheaper than DigitalOcean/Civo/Scaleway. Self-managed k3s via kube-hetzner Terraform module. |
| Nodes | ARM (CAX11) | Cheaper than x86. 1 CP + 3 workers, 4GB each. ~€32/month total. |
| Ingress | Traefik | Bundled by kube-hetzner. ingress-nginx retired March 2026. Gateway API migration in Phase 2. |
| GitOps | ArgoCD (app-of-apps) | Everything deployed via Git commits. CI never needs cluster credentials. |
| CI/CD | GitHub Actions → GHCR | PR: lint+test. Push to main: build → push → ArgoCD syncs. ARM-only builds (cluster is ARM-only). |
| Secrets | Infisical (self-hosted) | Chosen over Sealed Secrets (less learning value), Vault (unsealing complexity without cloud KMS), ESO (less mature UI). |
| Monitoring | Prometheus + Grafana | Phase 1: infra only. Phase 2: OpenTelemetry for app metrics/traces/logs. |
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

### Infra monitoring only (Phase 1)

Phase 1 deploys Prometheus + Grafana for cluster health. App-level observability (request metrics, traces, logs) deferred because:
- No app logic to observe yet
- OpenTelemetry SDK + Collector + Tempo + Loki is too much to absorb alongside K8s/Terraform/ArgoCD
- Significant resource footprint on small nodes

**Phase 2 approach:** OpenTelemetry SDK in NestJS (single instrumentation) → OTel Collector → Prometheus (metrics), Tempo (traces), Loki (logs).

### Custom Grafana dashboard over bundled

kube-prometheus-stack ships 23 generic dashboards. Replaced with 1 custom "Hearthly Cluster Health" dashboard designed from SRE first principles:
- Emergency row answers "is something broken?" in 2 seconds (OOMKills, CrashLoops, node readiness, failed backups)
- Saturation signals predict problems before outages (CPU throttling, memory-vs-limit)
- Node rootfs disk monitoring (not just PVCs) — disk full triggers pod eviction

### ArgoCD admission webhooks disabled

kube-prometheus-stack's Helm hook annotations for admission webhook creation block ArgoCD sync permanently (PreSync hooks never complete). Webhooks only validate PrometheusRule CRDs — not needed until custom alerting rules are written.

### ArgoCD controller memory (2Gi)

kube-prometheus-stack generates ~80 CRDs + many PrometheusRules and ServiceMonitors. The ArgoCD controller OOMs at 1Gi diffing these resources. 2Gi is the minimum for this monitoring stack.

### No staging environment

Production only. No staging until there are real features and users to justify the resource cost. A staging namespace is trivial to add later.

### Database schema strategy

One PostgreSQL instance, separate schemas per module via Drizzle migrations. If a service is ever extracted: evaluate per case (shared read-only access, API calls, or separate database depending on domain overlap).
