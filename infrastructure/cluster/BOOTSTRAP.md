# Bootstrap Secrets Inventory

> Every credential needed to **build or recover the cluster from cold**, where it lives,
> and which layer is authoritative. Tracked under issue #131, Task C.4.

## Principle

**The recovery path must not depend on the thing being recovered.**

Infisical (`secrets.hearthly.dev`) runs _inside_ the k3s cluster, behind its ingress.
If the Terraform workflow fetched its credentials from Infisical, then a sick cluster (or
a flapping ingress) would break Terraform — the very tool meant to rebuild the cluster.
This was a **proven** failure during the 2026-05 outage: the Terraform workflow failed
mid-incident on Infisical 502 / self-signed-cert errors.

Therefore the small set of **Terraform bootstrap secrets** lives in **GitHub Encrypted
Secrets** (outside the cluster), so `terraform apply` and a cold rebuild work even when the
cluster — and Infisical — is completely down.

Application/runtime secrets stay in Infisical. Only bootstrap/recovery credentials move out.

## Terraform bootstrap secrets (consumed by `.github/workflows/terraform.yml`)

| Infisical name            | GitHub Secret name        | Used by (out-of-cluster)                                  | Also consumed in-cluster?                                                                                           | Source of truth                       |
| ------------------------- | ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `S3_ACCESS_KEY`           | `TF_S3_ACCESS_KEY`        | TF state backend (both modules)                           | **Yes** — DB-backup CronJobs (`hearthly-managed-secrets`, `keycloak-s3-credentials`)                                | Infisical (canonical) + GitHub mirror |
| `S3_SECRET_KEY`           | `TF_S3_SECRET_KEY`        | TF state backend (both modules)                           | **Yes** — same as above                                                                                             | Infisical (canonical) + GitHub mirror |
| `HCLOUD_TOKEN`            | `HCLOUD_TOKEN`            | cluster module (Hetzner provider + `TF_VAR_hcloud_token`) | Indirectly — kube-hetzner writes the in-cluster `hcloud` Secret (hccm/CSI) **from this TF var**, not from Infisical | GitHub                                |
| `HCLOUD_SSH_PRIVATE_KEY`  | `HCLOUD_SSH_PRIVATE_KEY`  | cluster module (node SSH) + manual operator SSH           | No automated in-cluster consumer                                                                                    | GitHub                                |
| `KEYCLOAK_ADMIN_PASSWORD` | `KEYCLOAK_ADMIN_PASSWORD` | keycloak-config module                                    | **Yes** — Keycloak pod (`keycloak-admin-credentials`)                                                               | Infisical (canonical) + GitHub mirror |
| `GOOGLE_CLIENT_ID`        | `GOOGLE_CLIENT_ID`        | keycloak-config module (Google IdP)                       | No (TF writes it into Keycloak's own DB)                                                                            | GitHub                                |
| `GOOGLE_CLIENT_SECRET`    | `GOOGLE_CLIENT_SECRET`    | keycloak-config module (Google IdP)                       | No                                                                                                                  | GitHub                                |

The workflow maps each GitHub Secret back to the **exact env-var name** Terraform expects
(`S3_ACCESS_KEY`, `HCLOUD_TOKEN`, etc.) via per-job `env:` blocks — only the two S3 keys are
renamed (`TF_` prefix) on the GitHub side to avoid a generic collision.

## Source-of-truth & rotation rules

- **GitHub-only** (`HCLOUD_TOKEN`, `HCLOUD_SSH_PRIVATE_KEY`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`): nothing in-cluster reads these _from Infisical_. They may remain
  in Infisical as dead weight but it can be deleted there; **GitHub is authoritative**.
- **Duplicated — GitHub + Infisical** (`S3_ACCESS_KEY`, `S3_SECRET_KEY`,
  `KEYCLOAK_ADMIN_PASSWORD`): real in-cluster consumers sync these from Infisical, so they
  must stay there too. **Infisical is the human-facing source of truth; the GitHub copy is
  the bootstrap mirror.** When rotating one of these: **update Infisical first, then re-set
  the matching GitHub Secret** (`gh secret set …`). They do not auto-sync.
- **Pure-CI credentials** (e.g. a future read-only `ARGOCD_TOKEN` for deploy verification):
  no cluster meaning → **GitHub-only, never add to Infisical**.

## Other cold-rebuild dependencies (in-cluster bootstrap — tracked for the cold-recovery runbook, Task D.7)

Not part of the Terraform-secret move above, but required to bring a freshly-rebuilt cluster
back to a synced state. Listed here so the cold-recovery runbook (D.7) is complete:

| Item                                                                   | Today                     | Notes                                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ArgoCD repo token (`hearthly-repo` Secret, argocd ns)                  | manual K8s Secret         | HTTPS + GitHub token; SSH blocked by Hetzner firewall                                                                                                  |
| GHCR image pull secret                                                 | manual K8s Secret         | pulls `ghcr.io/rudingma/*` images                                                                                                                      |
| Infisical machine identity (`infisical-machine-identity`, hearthly ns) | manual K8s Secret         | universal-auth `clientId`/`clientSecret`; must exist before InfisicalSecret CRs in keycloak/monitoring can sync (cross-namespace bootstrap dependency) |
| cert-manager `letsencrypt-prod` ClusterIssuer                          | manual `kubectl apply`    | `infrastructure/cluster-services/cert-manager/clusterissuer.yaml` — intentionally not ArgoCD-managed                                                   |
| `NTFY_TOPIC` (alerting)                                                | Infisical + GitHub Secret | already mirrored in GitHub (external healthcheck uses it)                                                                                              |

These should be sourced from GitHub-backed bootstrap manifests as part of D.7; until then they
are documented manual steps in the cold-recovery procedure — see
[`runbook-cold-recovery.md`](./runbook-cold-recovery.md) (infra + k3s) and
[`docs/runbooks/argocd-cold-bootstrap.md`](../../docs/runbooks/argocd-cold-bootstrap.md) (the GitOps layer).
