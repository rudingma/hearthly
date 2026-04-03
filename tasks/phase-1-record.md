# Phase 1: Infrastructure Setup — Complete

Phase 1 delivered a fully automated Kubernetes infrastructure with no business features. Every push to main automatically lints, tests, builds, deploys, and is observable.

## Architecture Decisions

### Why infrastructure first?

Phase 1 deliberately contains no business features. The goal is a comfortable, fully automated development environment so that future feature work is smooth and easy.

### Tech Stack

- **Frontend:** Angular 21 + Capacitor. Leverages existing Angular skills. Capacitor wraps the web app for iOS/Android.
- **Backend:** NestJS 11 + Drizzle ORM + PostgreSQL 18. Drizzle chosen over Prisma (too much abstraction) and TypeORM (declining). SQL-first, type-safe. Full TypeScript end-to-end.
- **Architecture:** Modular monolith. Clean module boundaries via service interfaces, not direct table access.

### Infrastructure Choices

- **Hetzner Cloud** — 2-3x cheaper than DigitalOcean/Civo/Scaleway. Self-managed k3s via kube-hetzner Terraform module. Known trade-offs: no CSI VolumeSnapshots, incomplete S3 implementation (affects CNPG native backups).
- **ARM nodes (CAX11)** — Cheaper than x86. 1 control plane + 3 workers (4GB each). All Docker images have ARM builds.
- **Traefik** — Bundled by kube-hetzner. ingress-nginx was retired March 2026. Gateway API migration planned for Phase 2.
- **ArgoCD (app-of-apps)** — Only ArgoCD is helm-installed manually. Everything else deployed as ArgoCD Applications committed to Git. CI never needs cluster credentials.
- **Infisical** — Self-hosted secrets management. Chosen over Sealed Secrets (less learning value), OpenBao/Vault (unsealing complexity without cloud KMS), ESO (less mature UI).
- **Prometheus + Grafana** — Infrastructure monitoring only. App observability (OpenTelemetry → Tempo/Loki) deferred to Phase 2.
- **CloudNativePG** — Self-hosted PostgreSQL. Hetzner has no managed database. Backups via pg_dump CronJob (CNPG native backups not viable on Hetzner S3).

### Key Design Decisions

- **Environments:** Production only. No staging until there are features and users.
- **Namespaces:** One per service (hearthly, argocd, infisical, monitoring, traefik, cert-manager, kube-system, cnpg-system).
- **Terraform state:** Remote on Hetzner Object Storage (S3 backend). Separate state per directory.
- **Database schema:** One PostgreSQL instance, separate schemas per module via Drizzle migrations.
- **Docker builds:** ARM-only in CI (cluster is ARM-only). Multi-platform available locally.

## Implementation Log

| Task | What was done | Key issues encountered |
|---|---|---|
| 0: Git init | Private repo on GitHub | |
| 1: Local tooling | Node 24, all CLIs, CLAUDE.md | |
| 2: MCP setup | Skipped — CLI access covers all needs | |
| 3: Nx monorepo | hearthly-api (NestJS 11) + hearthly-app (Angular 21) | NX_IGNORE_UNSUPPORTED_TS_SETUP=true needed for Angular |
| 4: Docker Compose + Drizzle | PostgreSQL 18 on port 5434, Drizzle ORM | Port 5432 taken by other projects |
| 5: Dockerfiles | Multi-stage, non-root, API 335MB, App 82MB | npm workspaces requires copying workspace package.json before npm ci |
| 6: Hetzner account | Project `hearthly`, hcloud CLI configured | |
| 7: Terraform cluster | kube-hetzner v2.18.5, k3s v1.34, nbg1 | WSL2 CRLF breaks heredoc provisioners; fsn1→nbg1 (capacity); Traefik chart v34+ schema changes |
| 8: CloudNativePG | PostgreSQL 18.1 ARM64, 10Gi volume | |
| 9: DNS | Cloudflare (not Hetzner — registrar locks NS) | LB IP changed once during Traefik recreation |
| 10: Helm charts | API + App charts with Traefik ingress | |
| 11: ArgoCD | v3.3.6, self-managing, app-of-apps | SSH blocked by Hetzner firewall → HTTPS + token |
| 12: CI/CD | Parallel pipeline, ARM-only builds, Trivy scans | |
| 13: TLS | Let's Encrypt via cert-manager (bundled by kube-hetzner) | .dev requires HSTS |
| 14: Infisical | v0.158.0 + secrets-operator v0.10.29 | 500m CPU / 512Mi too low for ARM first-boot → 1 CPU / 1Gi |
| 15: Monitoring | kube-prometheus-stack v82.16.0, custom SRE dashboard | Admission webhooks blocked ArgoCD sync → disabled. Controller OOM at 1Gi → 2Gi |
| 16: Backups | Daily pg_dump → S3, SHA256 checksums, 30-day lifecycle | apk add fails as non-root → two-container pattern. CNPG native backups not viable (Hetzner S3 restore bug) |
| 17: End-to-end | All systems verified, README written | |

## Resource Budget (post-April 2026)

| Service | Memory request | Notes |
|---|---|---|
| k3s system (4 nodes) | ~2 GB | ~500 MB per node |
| Traefik | ~128 MB | Bundled by kube-hetzner |
| ArgoCD | ~832 MB | Controller needs 2Gi limit for kube-prometheus-stack CRDs |
| Prometheus + Grafana | ~608 MB | Prometheus 1Gi limit, Grafana 384Mi limit |
| cert-manager | ~64 MB | Bundled by kube-hetzner |
| Infisical + PG + Redis | ~734 MB | App ~350MB, PG ~256MB, Redis ~128MB |
| Infisical Operator | ~64 MB | |
| CloudNativePG | ~256 MB | |
| hearthly-api + hearthly-app | ~160 MB | |
| **Total** | **~4.8 GB** | **~7.2 GB headroom** on 12 GB total |

**Monthly cost:** ~€32 (4x CAX11 + LB11 + Object Storage base tier)

## Known Limitations (Hetzner-specific)

- **No CSI VolumeSnapshots** — Blocks CNPG native backups and Velero. Workaround: pg_dump CronJob.
- **S3 restore bug** — Barman byte-count mismatch on Hetzner Object Storage. Workaround: use aws-cli instead of barman.
- **Firewall blocks outbound SSH** — ArgoCD uses HTTPS + GitHub token instead.
- **WSL2 CRLF** — Terraform module files need `sed -i 's/\r$//'` after `terraform init`.
