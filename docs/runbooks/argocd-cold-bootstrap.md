# Runbook: ArgoCD Cold-Bootstrap

> Rebuild ArgoCD and hand the cluster back to GitOps when ArgoCD itself is
> gone or unrecoverable — without depending on ArgoCD to do it.
>
> Architecture plan Task **D.3** (issue #131).

## When to use this

- ArgoCD was deleted, corrupted, or its namespace is unrecoverable, **but the
  rest of the cluster (nodes, CSI, control plane) is healthy.**
- As the **second half** of a full disaster recovery: first rebuild the
  infrastructure with the Terraform cold-recovery runbook
  (`infrastructure/cluster/runbook-cold-recovery.md`, Task D.7), **then** run
  this to restore GitOps.

**ArgoCD cannot repair infrastructure.** A dead CSI driver, a full root disk, or
a dead control plane are not GitOps problems — ArgoCD running or not makes no
difference to them (Codex review answer F). Fix the infrastructure first; only
then is bootstrapping ArgoCD meaningful.

## Why single-replica (Option B), not HA

D.3 decision: **stay single-replica.** ArgoCD HA (repo-server ×2, server ×2,
applicationSet ×2, redis-ha) costs ~256 MiB more RAM and only protects against
a single ArgoCD pod dying — which self-heals on its own in a minute. It does
**nothing** against the failure modes that actually took us down (dead CSI, full
disk, dead CP, silent monitoring). Those require this cold-bootstrap procedure
regardless of replica count, so a rehearsed runbook is mandatory either way and
HA would be paying RAM for the wrong risk. The values stay at one replica per
component (`infrastructure/cluster-services/argocd/values.yaml`); resilience
comes from this runbook, not from in-cluster redundancy.

## Prerequisites

1. **kubectl** with a working kubeconfig pointing at the (recovered) cluster.
   Confirm the control plane answers and nodes are `Ready`:
   ```bash
   kubectl get nodes -o wide
   ```
2. **helm** v3.
3. A **clean clone** of this repo at the revision you want live (normally
   `main`). All paths below are relative to the repo root.
4. The **bootstrap credential values** — these live _outside_ the cluster (the
   recovery path must not depend on the thing being recovered). See
   `infrastructure/cluster/BOOTSTRAP.md` for the full inventory and sources.
   You need:
   | Credential | Used to create | Source |
   | --- | --- | --- |
   | GitHub repo token (read) | `hearthly-repo` Secret (ArgoCD → Git over HTTPS) | GitHub fine-grained PAT / operator store |
   | GHCR pull token | `ghcr-pull-secret` (pull `ghcr.io/rudingma/*`) | GitHub PAT with `read:packages` |
   | Infisical machine identity `clientId`/`clientSecret` | `infisical-machine-identity` Secret | Infisical (recorded out-of-band) |

   SSH to GitHub is **not** an option — Hetzner's firewall blocks outbound SSH,
   which is why ArgoCD uses HTTPS + token.

## Procedure

### 0. Confirm the infrastructure is actually healthy

```bash
kubectl get nodes
kubectl -n kube-system get pods            # CSI / CCM / coredns Running
kubectl get storageclass                   # hcloud-volumes + hcloud-volumes-retain present
```

If any of this is broken, **stop** and run the Terraform cold-recovery runbook
first. ArgoCD on top of broken infra will only churn.

### 1. Install ArgoCD via Helm

Same chart, version, and values the self-managing `argocd` Application uses, so
the result is identical to steady state. The release name `argocd` matches the
Application name, so when the `argocd` app reconciles in step 6 it **adopts**
these resources instead of duplicating them.

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update argo

helm install argocd argo/argo-cd \
  --version 9.4.17 \
  --namespace argocd --create-namespace \
  -f infrastructure/cluster-services/argocd/values.yaml

kubectl -n argocd rollout status deploy/argocd-server --timeout=300s
```

> Dry-run check (no cluster changes):
> `helm template argocd argo/argo-cd --version 9.4.17 -n argocd -f infrastructure/cluster-services/argocd/values.yaml`
> renders 41 objects, all single-replica.

### 2. Create the Git repo credential Secret

ArgoCD needs this to read the repo _before_ the root app exists.

```bash
kubectl -n argocd create secret generic hearthly-repo \
  --from-literal=type=git \
  --from-literal=url=https://github.com/rudingma/hearthly.git \
  --from-literal=username='<github-username>' \
  --from-literal=password='<github-repo-token>'

kubectl -n argocd label secret hearthly-repo \
  argocd.argoproj.io/secret-type=repository
```

### 3. Create the app namespaces + GHCR pull secret

The pull secret must exist before workloads sync, or image pulls fail.
`CreateNamespace=true` on the apps makes creating the namespace here harmless
(ArgoCD adopts it).

```bash
for ns in hearthly keycloak; do
  kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n "$ns" create secret docker-registry ghcr-pull-secret \
    --docker-server=ghcr.io \
    --docker-username='<ghcr-username>' \
    --docker-password='<ghcr-token>'
done
```

### 4. Create the Infisical machine identity Secret

In the `hearthly` namespace. It is a **cross-namespace bootstrap dependency**:
the `InfisicalSecret` CRs in `keycloak` and `monitoring` cannot sync until this
exists, so create it before the root app brings those apps up.

```bash
kubectl -n hearthly create secret generic infisical-machine-identity \
  --from-literal=clientId='<infisical-client-id>' \
  --from-literal=clientSecret='<infisical-client-secret>'
```

### 5. Apply the cert-manager ClusterIssuer

cert-manager itself is installed by kube-hetzner (Terraform), not ArgoCD. The
`letsencrypt-prod` ClusterIssuer is intentionally **not** ArgoCD-managed, so
apply it by hand. Idempotent if it already exists.

```bash
kubectl apply -f infrastructure/cluster-services/cert-manager/clusterissuer.yaml
```

### 6. Apply the root app-of-apps — hand over to GitOps

```bash
kubectl apply -f infrastructure/cluster-services/argocd/applications/root.yaml
```

The root app deploys everything under `applications/`. **Sync-wave `-2`** on
`gateway-api-crds` and `storageclasses` makes them sync **first**, before route
and PV consumers. The `argocd` self-managing app reconciles the Helm-installed
ArgoCD to the declared values (adopting the step-1 release).

### 7. Verify

```bash
# All applications converge to Synced / Healthy:
kubectl -n argocd get applications

# Gateway API CRDs + StorageClasses landed (sync-wave -2):
kubectl get crd | grep gateway.networking.k8s.io
kubectl get storageclass

# Public endpoints (see project CLAUDE.md "Production Health Checks"):
curl -sI https://argocd.hearthly.dev/    # 200
curl -sI https://hearthly.dev/           # 200
curl -sI https://api.hearthly.dev/health # 200
```

When every Application is `Synced/Healthy` and the endpoints answer, GitOps is
back in control — done.

## Notes

- **Order in a full DR:** Terraform cold-recovery (D.7) → this runbook. This one
  assumes a live, healthy cluster.
- **Secrets stay out of Git.** Every `<placeholder>` above is supplied at
  recovery time from the out-of-cluster sources in `BOOTSTRAP.md`. Nothing here
  is committed.
- **Rehearsal:** steps 1, 5, 6 are verifiable without applying via
  `helm template` / `kubectl apply --dry-run=server` (all confirmed to resolve
  against the live API). A full rehearsal belongs in a throwaway namespace or a
  rebuilt-from-Terraform cluster, not production.
