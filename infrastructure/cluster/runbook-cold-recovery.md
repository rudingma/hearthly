# Runbook: Terraform Cold-Recovery

> Rebuild the k3s cluster from a clean clone + the out-of-cluster bootstrap
> secrets, with **no reachable cluster** — then hand off to the ArgoCD
> cold-bootstrap runbook to restore workloads.
>
> Architecture plan Task **D.7** (issue #131). Depends on **C.4** (bootstrap
> secrets out of Infisical — done) and **C.5** (state locking — see the caveat
> at the end; not yet enforced).

## Principle

**The recovery path must not depend on the thing being recovered.** Every
credential below lives _outside_ the cluster — in GitHub Encrypted Secrets and
the operator's secure store — so a `terraform apply` works even when the
cluster (and Infisical) is completely down. Full inventory: `BOOTSTRAP.md`
(same directory).

## When to use this

- **Total cluster loss** (all nodes gone / unrecoverable), or building from
  scratch. This is the **first half** of full DR; the **second half** is
  `docs/runbooks/argocd-cold-bootstrap.md` (GitOps layer).
- **Single-node loss:** Terraform rebuilds one worker in place — see
  **Rehearsal** at the end (the safe way to exercise this whole path).
- If nodes exist but only k3s/ingress is sick, prefer targeted repair; a full
  apply is heavy.

## Prerequisites

- A workstation with **terraform ≥ 1.5**, **git**, **kubectl**, **helm**
  (and optionally the `hcloud` CLI).
- A **clean clone** of this repo at `main`.
- The **Terraform state is intact** in the `hearthly-tfstate` bucket (Hetzner
  Object Storage — independent of the cluster, which is the point). If the
  _state_ (and buckets/snapshot) are also gone, this is a different, harder
  rebuild from absolute zero — see
  [`docs/runbooks/cold-shutdown-and-genesis.md`](../../docs/runbooks/cold-shutdown-and-genesis.md).
- The bootstrap secret **values** (from `BOOTSTRAP.md`):
  | Value | Used for |
  | --- | --- |
  | `S3_ACCESS_KEY` / `S3_SECRET_KEY` | TF state backend (both modules) |
  | `HCLOUD_TOKEN` | Hetzner provider (`TF_VAR_hcloud_token`) |
  | `HCLOUD_SSH_PRIVATE_KEY` + canonical public key | node SSH (`~/.ssh/id_ed25519`) |
  | `KEYCLOAK_ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | keycloak-config module |

## Procedure

### 1. Clone

```bash
git clone https://github.com/rudingma/hearthly.git
cd hearthly/infrastructure/cluster
```

### 2. Provide credentials (env + local files — never committed)

**SSH keypair** — must be **byte-for-byte** the key registered in Hetzner and
tracked in TF state. A mismatch (even a different comment or a stray trailing
newline) forces a spurious `hcloud_ssh_key` replacement and can break the
module's SSH remote-exec.

```bash
install -m600 /path/to/hcloud_ssh_private_key ~/.ssh/id_ed25519
# Canonical public key WITH its original comment — do NOT derive via `ssh-keygen -y`:
printf '%s\n' '<HCLOUD_SSH_PUBLIC_KEY>' > ~/.ssh/id_ed25519.pub
```

**Backend credentials** (`backend.conf` is gitignored):

```bash
cat > backend.conf <<EOF
access_key = "<S3_ACCESS_KEY>"
secret_key = "<S3_SECRET_KEY>"
EOF
```

**Hetzner API token:**

```bash
export TF_VAR_hcloud_token='<HCLOUD_TOKEN>'
```

(`ssh_public_key_file` / `ssh_private_key_file` default to `~/.ssh/id_ed25519(.pub)`;
override with `TF_VAR_…` if your keys live elsewhere.)

### 3. Init, then (WSL2 only) strip CRLF from the vendored module

```bash
terraform init -backend-config=backend.conf
```

> **WSL2:** the kube-hetzner module downloads with CRLF line endings that break
> its heredocs. Run this **after every `init`**:
>
> ```bash
> find .terraform/modules/kube-hetzner -type f \
>   \( -name '*.tf' -o -name '*.sh' -o -name '*.yaml' -o -name '*.tpl' \) \
>   -exec sed -i 's/\r$//' {} +
> ```

### 4. Plan — READ IT (hard gate)

```bash
terraform plan -input=false -out=tfplan
```

- **Cold** (servers gone): expect creation of the missing servers / network /
  LB.
- **Warm** (servers exist, k3s sick): expect a reconcile.
- **STOP** if the plan shows destruction or replacement of surviving **DB
  volumes** (`hcloud_volume`) — those hold the data. The CNPG volumes use
  `reclaimPolicy: Retain` (D.5) and must survive. Never auto-approve past an
  unexpected `destroy`/`-/+ replacement`.

### 5. Apply

```bash
terraform apply -input=false tfplan
```

Provisions nodes + installs k3s and the bundled add-ons (Traefik, cert-manager,
hcloud CSI/CCM, kured, metrics-server). When it finishes, grab the kubeconfig:

```bash
terraform output -raw kubeconfig > ~/.kube/hearthly
export KUBECONFIG=~/.kube/hearthly
kubectl get nodes        # all Ready
```

### 6. Post-apply Kubernetes bootstrap → hand to ArgoCD

Terraform gives you nodes + k3s + add-ons, but **not** the GitOps layer or its
secrets. Run `docs/runbooks/argocd-cold-bootstrap.md` to install ArgoCD, create
the `hearthly-repo` / `ghcr-pull-secret` / `infisical-machine-identity` secrets,
apply the cert-manager `letsencrypt-prod` ClusterIssuer, and apply the root
app-of-apps. ArgoCD then syncs everything — including Infisical, which
re-populates the in-cluster runtime secrets.

### 7. keycloak-config module (realm + Google IdP)

This configures Keycloak through its **admin REST API**, so Keycloak must be
**running and reachable** first (i.e. after step 6 brings it up).

```bash
cd ../keycloak-config
cat > backend.conf <<EOF
access_key = "<S3_ACCESS_KEY>"
secret_key = "<S3_SECRET_KEY>"
EOF
terraform init -backend-config=backend.conf
export TF_VAR_keycloak_admin_password='<…>'
export TF_VAR_google_client_id='<…>'
export TF_VAR_google_client_secret='<…>'
terraform plan -input=false -out=tfplan   # read it
terraform apply -input=false tfplan
```

### 8. Verify

- `kubectl get nodes` → all Ready; add-ons Running.
- `kubectl -n argocd get applications` → all Synced/Healthy.
- The 6 public endpoints (project CLAUDE.md → "Production Health Checks").

## Full-DR ordering

1. **Steps 1–5** here — infra + k3s.
2. **ArgoCD cold-bootstrap** (`docs/runbooks/argocd-cold-bootstrap.md`) — brings
   up workloads incl. Keycloak + the CNPG databases.
3. **Step 7** here — keycloak-config, once Keycloak answers.
4. **DB data restore** only if the volumes did **not** survive — Barman / pg_dump
   restore (Task D.6). Retain-policy volumes normally survive node loss, so this
   is usually unnecessary.

## State-locking caveat (C.5 / #126 — NOT yet enforced)

Hetzner Object Storage has no native state lock, and locking is not yet wired
(Task C.5). Until it is: **never run a manual `terraform apply` while the
Terraform GitHub workflow might also run**, and never run two applies at once —
concurrent writes can corrupt the state file. The CI workflow serializes itself
via `concurrency` groups; a manual recovery apply must be the **only** apply in
flight — pause/disable the `Terraform` workflow for the duration of recovery.

## Rehearsal — destroy one worker, rebuild (low risk)

Exercises the whole clone → init → plan → apply path with a blast radius of one
node:

1. `kubectl drain <worker> --ignore-daemonsets --delete-emptydir-data` then
   cordon it (CNPG HA + topology spread keep services up).
2. Delete that worker's server in the Hetzner console / `hcloud server delete` —
   simulates the loss.
3. From a clean clone, do steps 1–4 and confirm the **plan recreates exactly
   that one server**, with **no `hcloud_volume` changes** and no other
   destruction. Then apply.
4. Confirm the node rejoins `Ready` and workloads reschedule onto it.

## Notes

- **Secrets stay out of Git.** Every `<placeholder>` is supplied at recovery
  time from the out-of-cluster store (`BOOTSTRAP.md`); `backend.conf` and the
  `~/.ssh` keys are gitignored / local-only.
- **DB data is not in Terraform.** Volumes use `reclaimPolicy: Retain` (D.5) and
  survive node loss; genuine data loss needs a Barman/pg_dump restore (D.6).
