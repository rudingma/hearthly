# Runbook: Complete Shutdown & Cold Genesis

> Mothball the **entire** Hetzner footprint — cluster, volumes, object-storage
> buckets, Terraform state, and the MicroOS snapshot — then rebuild it later
> **from absolute zero**, as if deploying for the very first time.
>
> This is the deliberate, planned variant of total loss. Use it to park the
> project to save cost. **No application data is preserved** (the databases come
> back empty via CNPG `initdb`); that is the intended outcome here.

## Genesis vs. cold-recovery — know which one you're in

|                                                | Terraform state                  | Bring-back path                                                                              |
| ---------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| **Cold-recovery** (`runbook-cold-recovery.md`) | **intact** in `hearthly-tfstate` | `terraform apply` reconciles — the bucket + snapshot already exist                           |
| **Cold genesis** (this runbook)                | **destroyed** with the buckets   | first-time deploy — you must recreate the buckets + snapshot before Terraform can run at all |

If you only want to stop the compute bill and return easily, **do not use this
runbook** — keep the state bucket + the MicroOS snapshot (a few cents/month) and
use the cold-recovery path instead. This runbook is for a genuinely complete
teardown, or to rehearse that the project is reproducible from nothing.

## The lifeline — what MUST survive a complete shutdown

Everything on Hetzner is disposable. The project can only be rebuilt because
these live **outside** Hetzner:

- **The GitHub repo** (`rudingma/hearthly`) — the entire source of truth: cluster
  Terraform, GitOps app-of-apps, Keycloak realm config, DB schemas/migrations.
- **GitHub Encrypted Secrets** — the bootstrap credentials (`BOOTSTRAP.md`).
- **The domain + Cloudflare zone** (`hearthly.dev`) — registrar + DNS records.
- **The Google OAuth app** — client ID/secret + authorized redirect URIs
  (`https://auth.hearthly.dev/realms/hearthly/broker/google/endpoint`). Domain-
  based, so it stays valid across a rebuild.
- **GHCR images** (`ghcr.io/rudingma/hearthly-{api,app,keycloak}`) — persist
  independently of the cluster (rebuildable via `deploy.yml` if deleted).

> **Almost everything else is regenerable.** A fresh deploy can mint a new
> `HCLOUD_TOKEN`, a new SSH keypair, new S3 keys, a new Keycloak admin password,
> and new ntfy topics. The only hard external dependencies are the **domain** and
> the **Google OAuth app**. Keeping the secret _values_ in a password manager
> just saves time; losing them is not fatal.

---

# Part 1 — Complete shutdown (mothball to zero)

Operator-run. Needs `HCLOUD_TOKEN` + the S3 backend keys (both yours, from the
out-of-cluster store).

### 1. Pause the automation

So nothing tries to redeploy mid-teardown and the 5-minute external healthcheck
doesn't page you for your own shutdown:

```bash
gh workflow disable terraform.yml
gh workflow disable deploy.yml
gh workflow disable healthcheck.yml   # confirm the exact name: gh workflow list
```

### 2. Destroy the cluster module (nodes + network + LB)

```bash
cd infrastructure/cluster
terraform init -backend-config=backend.conf
# WSL2 only — strip CRLF from the vendored module after every init:
find .terraform/modules/kube-hetzner -type f \
  \( -name '*.tf' -o -name '*.sh' -o -name '*.yaml' -o -name '*.tpl' \) \
  -exec sed -i 's/\r$//' {} +

export TF_VAR_hcloud_token='<HCLOUD_TOKEN>'   # + ~/.ssh/id_ed25519(.pub) as in runbook-cold-recovery

terraform plan -destroy -out=tfplan           # READ IT (hard gate)
#   Expect: the 4 servers, network/subnets, hcloud_load_balancer.cluster,
#   firewall, placement groups, SSH key. The ingress LB IP is released here.
terraform apply tfplan
```

Do **not** bother destroying the `keycloak-config` module — its resources live
inside Keycloak, which is going away; its state is deleted with the bucket in
step 5.

### 3. Delete the orphaned DB volumes

The CNPG volumes are CSI-provisioned (not in TF state) with `reclaimPolicy:
Retain`, so they survive the destroy. There is no data to keep:

```bash
hcloud volume list                 # the 4 CNPG volumes (hearthly-db-1/2, keycloak-db-1/2)
hcloud volume delete <id> ...
```

### 4. Delete the MicroOS snapshot

```bash
hcloud image list --type snapshot  # labelled microos-snapshot=yes
hcloud image delete <id> ...
```

> Keeping the snapshot costs only a few cents/month and removes step 3 of Part 2.
> Delete it only if you truly want the project empty; otherwise leave it.

### 5. Delete the object-storage buckets — the point of no return

This destroys **all Terraform state** (`cluster/` + `keycloak-config/` keys in
`hearthly-tfstate`). After this, bring-back is genesis (Part 2), not recovery.

Empty then delete both buckets via the Hetzner Console (Object Storage) or an S3
client pointed at `https://nbg1.your-objectstorage.com`:

- `hearthly-tfstate` — Terraform state for both modules
- `hearthly-backups` — DB dumps (irrelevant now)

### 6. Verify the project is empty

```bash
hcloud server list          # empty
hcloud load-balancer list   # empty
hcloud volume list          # empty
hcloud network list         # empty
hcloud image list --type snapshot   # empty (if you deleted it)
```

Cloudflare A records now point at a released IP — harmless; leave them (re-pointed
in Part 2) or remove them. The shutdown is complete. Standing cost: ~€0.

---

# Part 2 — Cold genesis (rebuild from absolute zero)

This is a **first-time deploy**. The existing runbooks cover the cluster and
GitOps layers but **assume the buckets, snapshot, and Infisical already exist** —
this part fills exactly those gaps, then hands off to them.

### 0. Workstation prerequisites

`terraform >= 1.10`, `packer`, `kubectl`, `helm`, `hcloud`, an S3 client
(`aws`/`s3cmd`/`rclone`), `gh`. A **clean clone** of the repo at `main`.

### 1. Hetzner project + API token

Ensure a Hetzner Cloud project exists and generate a read/write API token →
this is `HCLOUD_TOKEN`. `export TF_VAR_hcloud_token='<token>'`.

### 2. Recreate the object-storage buckets + S3 credentials

Terraform's S3 backend **cannot create its own backend bucket** (chicken-and-egg),
so this is manual and must happen **before** `terraform init`.

In the Hetzner Console → Object Storage (location **nbg1**, which the backend
addresses as region `eu-central` / endpoint `nbg1.your-objectstorage.com`):

1. Create bucket **`hearthly-tfstate`**.
2. Create bucket **`hearthly-backups`**.
3. Generate a set of S3 credentials → these are `S3_ACCESS_KEY` / `S3_SECRET_KEY`
   (used by both the TF backend and the in-cluster DB-backup CronJobs).

Write the backend config both modules expect (gitignored):

```bash
cat > backend.conf <<EOF
access_key = "<S3_ACCESS_KEY>"
secret_key = "<S3_SECRET_KEY>"
EOF
```

### 3. Build the MicroOS snapshot

kube-hetzner needs a MicroOS image snapshot to create nodes. `main.tf` pins no
snapshot ID, so it auto-selects the most recent one labelled `microos-snapshot=yes`.

```bash
export HCLOUD_TOKEN='<HCLOUD_TOKEN>'
curl -sL https://raw.githubusercontent.com/kube-hetzner/terraform-hcloud-kube-hetzner/master/packer-template/hcloud-microos-snapshots.pkr.hcl \
  -o /tmp/microos.pkr.hcl
packer init /tmp/microos.pkr.hcl
packer build /tmp/microos.pkr.hcl       # builds x86 + ARM snapshots; cax11 uses ARM
```

### 4. Re-set the GitHub bootstrap secrets (if needed)

If the repo + its Encrypted Secrets survived, skip this. Otherwise re-set all
seven per `infrastructure/cluster/BOOTSTRAP.md` with `gh secret set` (regenerate
values as noted in the lifeline section):

```
TF_S3_ACCESS_KEY  TF_S3_SECRET_KEY  HCLOUD_TOKEN  HCLOUD_SSH_PRIVATE_KEY
KEYCLOAK_ADMIN_PASSWORD  GOOGLE_CLIENT_ID  GOOGLE_CLIENT_SECRET
```

### 5. Provision the cluster (Terraform)

Follow **`infrastructure/cluster/runbook-cold-recovery.md` steps 2–5**
(SSH keypair, `TF_VAR_hcloud_token`, `init` + WSL2 CRLF fix, `plan`, `apply`).
Because the state bucket is brand-new and empty, the plan is a **full create**
(servers, network, LB, k3s + add-ons), not a reconcile. Then:

```bash
terraform output -raw kubeconfig > ~/.kube/hearthly
export KUBECONFIG=~/.kube/hearthly
kubectl get nodes        # all Ready
```

### 6. Bootstrap ArgoCD, then seed Infisical — mind the ordering

Genesis differs from a normal cold-bootstrap in one important way: **Infisical
comes up empty**, so you cannot pre-create a _valid_ `infisical-machine-identity`
secret before Infisical exists. The order is:

1. Run **`docs/runbooks/argocd-cold-bootstrap.md` steps 1–3 + 5–6**: install
   ArgoCD, create `hearthly-repo`, create the `ghcr-pull-secret`, apply the
   `letsencrypt-prod` ClusterIssuer, and apply the root app-of-apps. The root app
   brings up Infisical (among everything else).
2. **Seed Infisical** (step 7 below) — create the project, secrets, and machine
   identity in the now-running, empty Infisical.
3. Create the real `infisical-machine-identity` secret (cold-bootstrap step 4)
   with the clientId/secret minted in step 7.

Until 2–3 are done, the `InfisicalSecret` CRs in `keycloak`/`monitoring` (and the
`hearthly-managed-secrets` sync) stay pending and those apps won't fully sync —
expected on genesis.

### 7. Seed Infisical (genesis-only — the chunkiest manual step)

Reach Infisical at `https://secrets.hearthly.dev` (or
`kubectl -n infisical port-forward svc/... 8080`) and:

1. Complete the **first-run admin** signup (fresh instance has no users).
2. Create a **project**. Infisical assigns it a **new UUID** — note it.
3. In environment **`prod`**, at secrets path **`/`**, add:
   | Secret | Consumed by |
   | --- | --- |
   | `KEYCLOAK_ADMIN_PASSWORD` | `keycloak-admin-credentials` (keycloak ns) |
   | `S3_ACCESS_KEY`, `S3_SECRET_KEY` | DB-backup CronJobs (keycloak + hearthly ns) |
   | `NTFY_ALERTS_TOPIC` | Alertmanager ntfy sidecar (monitoring ns) |
   | `NTFY_DEADMAN_TOPIC` | deadman-heartbeat CronJob (monitoring ns) |
4. Create a **machine identity** (universal auth), grant it **read** on the
   project's `prod` env, and copy its `clientId` / `clientSecret`.
5. **Update the hardcoded `projectId`** — the three `InfisicalSecret` CRs pin the
   old project UUID (`8e2b05b0-c7e7-4e4c-89a7-90bba3e8c705`). Replace it with the
   new project's UUID in all three, then commit + push (ArgoCD syncs):
   - `infrastructure/cluster-services/keycloak/templates/infisical-secret.yaml`
   - `infrastructure/cluster-services/keycloak/templates/infisical-s3-secret.yaml`
   - `infrastructure/cluster-services/monitoring/templates/infisical-ntfy-secret.yaml`
6. Create the machine-identity secret:
   ```bash
   kubectl -n hearthly create secret generic infisical-machine-identity \
     --from-literal=clientId='<id>' --from-literal=clientSecret='<secret>'
   ```

The `InfisicalSecret` CRs then resync and populate the managed K8s secrets;
dependent apps go Healthy.

### 8. Configure Keycloak (Terraform)

Once Keycloak answers, follow **`runbook-cold-recovery.md` step 7**:
`cd infrastructure/keycloak-config`, write its `backend.conf`, `init`, export the
three `TF_VAR_keycloak_*` / `TF_VAR_google_*` values, `plan`, `apply`. This
recreates the realm, the `hearthly-app` client, and the Google IdP from scratch.

### 9. Point DNS at the new LB

The new ingress LB has a **new IP**. Update the Cloudflare A records (DNS-only,
no proxy) for `@`, `api`, `auth`, `argocd`, `grafana`, `secrets`:

```bash
hcloud load-balancer list          # new public IP
```

### 10. Images, workflows, verify

- Ensure the repo is **public** and the GHCR images exist; if the packages were
  deleted, run `deploy.yml` to rebuild/push before workloads can pull.
- Re-enable the workflows: `gh workflow enable terraform.yml deploy.yml healthcheck.yml`.
- Verify: `kubectl -n argocd get applications` all Synced/Healthy, then the six
  public endpoints (project `CLAUDE.md` → "Production Health Checks").

The databases come up **empty** (CNPG `initdb`; the API auto-applies Drizzle
migrations on startup) — a clean first-deploy state, exactly as intended.

---

## Notes

- **Secrets stay out of Git.** Every `<placeholder>` is supplied at rebuild time;
  `backend.conf` and `~/.ssh` keys are gitignored / local-only.
- **The genesis gaps that aren't in the other runbooks** are, specifically: the
  bucket creation (step 2), the snapshot build (step 3), the Infisical re-seed +
  `projectId` edit (step 7), and the DNS re-point (step 9). Everything else is a
  handoff to `runbook-cold-recovery.md` and `argocd-cold-bootstrap.md`.
- **Rehearsing this is the real test.** Tearing down completely and rebuilding
  from zero is the only way to prove the project is reproducible — and to find
  the next uncodified step before it matters.
