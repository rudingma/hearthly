# Infrastructure — Project Instructions

## Cluster

- **Location:** nbg1 (Nuremberg)
- **Nodes:** 1x CAX11 control plane + 3x CAX11 workers (ARM, 4 GB each)
- **k3s:** v1.34.5 (stable channel, auto-upgrades enabled)
- **Traefik LB IP:** 46.225.42.23 (IPv4), 2a01:4f8:1c1f:72d7::1 (IPv6)
- **Module:** kube-hetzner `~> 2.19.1` (see `cluster/main.tf` for exact constraint)
- **Terraform state:** Hetzner Object Storage (S3 backend, bucket: hearthly-tfstate). Separate state per directory.
- **Bundled services:** Traefik, cert-manager, hcloud CSI/CCM, metrics-server, kured
- **DNS:** Cloudflare (registrar locks NS). A records: @, api, argocd, auth, grafana, secrets → LB IP. DNS only (no proxy).

## Routing (Gateway API)

All external traffic routes through Kubernetes Gateway API (HTTPRoute).

- **Gateway:** `traefik-gateway` in `traefik` namespace, GatewayClass `traefik`
- **TLS:** cert-manager auto-provisions via `letsencrypt-prod` cluster issuer. ClusterIssuer uses HTTP-01 challenge with Traefik ingress class.
- **Config:** Listeners in `cluster/main.tf` (`traefik_merge_values`). HTTPRoutes in each app's Helm chart.
- **Adding a new service:** Add a `websecure-*` listener in `traefik_merge_values` (with hostname, certificateRefs), then create an HTTPRoute in the service's Helm chart referencing the listener via `sectionName`.
- **cert-manager ClusterIssuer is NOT ArgoCD-managed** — requires manual bootstrap: `kubectl apply -f infrastructure/cluster-services/cert-manager/clusterissuer.yaml`

## ArgoCD

- **Version:** v3.3.6 (Helm chart v9.4.17)
- **UI:** argocd.hearthly.dev
- **Repo access:** HTTPS + GitHub token (SSH blocked by Hetzner firewall). Token in K8s Secret `hearthly-repo` in argocd namespace.
- **Applications:** root (app-of-apps), hearthly-api, hearthly-app, hearthly-db, keycloak, keycloak-db, monitoring, infisical, network-policies, argocd (self-managing). All auto-sync + self-heal.
- **Adding a new ArgoCD app:** Create an Application manifest in `infrastructure/cluster-services/argocd/applications/`.

## Keycloak (Identity Provider)

- **Version:** 26.5.5 (Quarkus-based, official image — NOT Bitnami, paywalled since Aug 2025)
- **Image:** `ghcr.io/rudingma/hearthly-keycloak` (custom optimized build, ARM64)
- **Authentication:** Social-only (Google). No username/password form — uses custom `social-only-browser` flow with `first-broker-auto-link`. Direct Keycloak access without `kc_idp_hint` shows a custom error page.
- **Custom login theme:** `hearthly` at `deploy/themes/hearthly/` (FreeMarker templates, custom CSS)
- **Namespace:** `keycloak` (dedicated), DB in separate CloudNativePG cluster `keycloak-db`
- **Dockerfile:** `cluster-services/keycloak/deploy/Dockerfile`
- **Chart:** `cluster-services/keycloak/` (custom Helm chart)
- **Upgrade:** Change `FROM` tag in Dockerfile → CI rebuilds → auto-deploys
- **Secrets:** Admin password via Infisical, DB password via CloudNativePG auto-generated secret

### Keycloak Realm (Terraform)

- **Module:** `keycloak-config/` (separate Terraform state)
- **Realm:** `hearthly`, client `hearthly-app` (public, PKCE), default role `user`, Google IdP with picture attribute mapping
- **IdP config is Terraform-managed** — modifying in Keycloak UI will drift and revert on next apply
- **Apply:** Requires 3 variables — see `keycloak-config/variables.tf`:
  ```bash
  export TF_VAR_keycloak_admin_password=...
  export TF_VAR_google_client_id=...
  export TF_VAR_google_client_secret=...
  cd infrastructure/keycloak-config && terraform init -backend-config=backend.conf && terraform apply
  ```

## Infisical (Secrets Management)

- **Deployed at:** `cluster-services/infisical/` (umbrella Helm chart, bundled PostgreSQL + Redis)
- **Secrets Operator** syncs Infisical secrets to K8s Secrets
- **Cross-namespace:** Machine identity Secret in `hearthly` namespace is referenced by InfisicalSecret resources in `keycloak` and `monitoring` namespaces. This Secret must exist before those apps can sync (bootstrap dependency).

## Databases (Production)

- **Operator:** CloudNativePG v1.28.1 (namespace: cnpg-system)
- **hearthly-db:** hearthly namespace, 10Gi. `DATABASE_URL` from K8s Secret `hearthly-db-app`. Backups: daily pg_dump at 02:00 UTC → `hearthly-backups` S3 bucket.
- **keycloak-db:** keycloak namespace, 5Gi. Credentials in K8s Secret `keycloak-db-app`. Backups: daily at 03:00 UTC → same bucket, prefix `keycloak-db-`.
- **PV reclaim:** Retain on both (patched manually).

## Alerting & Monitoring

Two independent alerting paths push notifications via ntfy.sh:

- **In-cluster:** Prometheus → Alertmanager → `alertmanager-ntfy` sidecar → ntfy.sh
- **External:** GitHub Actions healthcheck (every 5 min) curls all 6 endpoints. Independent of cluster.
- **ntfy topic:** Infisical (`NTFY_TOPIC`), intentionally decoupled between cluster and GitHub Actions.
- **Custom rules:** See `cluster-services/monitoring/templates/prometheusrule-*.yaml`
- **Admission webhooks:** cert-manager issues webhook TLS cert. k3s quirks: webhook port must be 8443 (not 10250), NetworkPolicy must allow ingress from any source on that port.
- **CRD selectors:** `ruleSelectorNilUsesHelmValues: false` + `serviceMonitorSelectorNilUsesHelmValues: false`
- **Grafana gotchas:** Uses `namespaceOverride: monitoring` (ArgoCD renders in argocd namespace, causes drift without this). Uses `Recreate` strategy (hcloud-volumes are ReadWriteOnce — RollingUpdate fails).

## NetworkPolicies

Default-deny both ingress and egress per namespace. 35 policies across 6 namespaces.

- **Covered:** `hearthly`, `keycloak`, `argocd`, `monitoring`, `cnpg-system`, `infisical`
- **Skipped:** `kube-system`, `traefik`
- **Baseline:** `network-policies/` (centralized Helm chart). Per-app policies in each app's Helm chart.
- **API server egress:** Uses both ClusterIP (`10.43.0.1:443`) and control plane node IP (`10.255.0.101:6443`) — see Known Issues.
- **Control plane IP:** In `network-policies/values.yaml` as `apiServer.nodeIP`. Update if CP node is replaced.

## CI/CD Pipeline

- **CI:** `ci.yml` — lint, test, build affected (x86, Node.js 24)
- **Deploy:** `deploy.yml` — builds API, App, Keycloak on ARM64 runners, Trivy scan before push
- **Terraform:** `terraform.yml` — plan on PR (posted as comment), apply on merge. CI fetches secrets via Infisical OIDC (identity ID and project slug hardcoded in workflow).
- **ARM64 runners require public repo** — if repo goes private, Docker build jobs fail
- **Terraform concurrency:** serialized per module (`cancel-in-progress: false`) — Hetzner S3 has no state locking. **No manual `terraform apply` while CI is running.**

## Terraform Commands

```bash
cd infrastructure/cluster && terraform init -backend-config=backend.conf
cd infrastructure/cluster && terraform plan
cd infrastructure/cluster && terraform apply
```

## Known Issues

- **WSL2 + kube-hetzner CRLF:** Terraform module files download with CRLF on WSL2, breaking heredocs. Fix: `find .terraform/modules/kube-hetzner -name "*.tf" -exec sed -i 's/\r$//' {} +` (also .sh, .yaml, .tpl). Re-run after `terraform init`.
- **Hetzner firewall blocks outbound SSH:** ArgoCD uses HTTPS + token. If other services need SSH, add `extra_firewall_rules` in main.tf.
- **k3s NetworkPolicy + API server DNAT:** kube-router evaluates egress after DNAT. Traffic to ClusterIP `10.43.0.1:443` is rewritten to node IP `10.255.0.101:6443`. Include both IPs in API server egress rules.
