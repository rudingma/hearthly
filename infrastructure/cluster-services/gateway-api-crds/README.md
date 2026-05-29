# Gateway API CRDs (explicitly owned, pinned)

`standard-install.yaml` is the **vendored** Gateway API **v1.5.1 Standard channel**
CRD bundle (`kubectl-sigs/gateway-api` release `v1.5.1`), owned by the
`gateway-api-crds` ArgoCD app.

## Why this exists

Traefik (the ingress) and the Gateway API CRDs are a **compatibility set** and
must be upgraded together. They used to be implicitly bundled by k3s/the Traefik
Helm chart, which let them drift: on 2026-05-29 a k3s auto-upgrade bumped Traefik
to **v3.7.1** (which depends on **Gateway API v1.5.1**, where `TLSRoute` is
_Standard_ and served at `v1`), while the cluster CRDs were still **v1.4.0**
(`TLSRoute` experimental, `v1alpha2/3`). Traefik's `kubernetesGateway` provider
could not sync its `v1.TLSRoute` informer → it built **zero HTTP routers** →
every host 404'd → **full ingress outage**. See issue #131.

## The contract

- These CRDs are **pinned** and version-controlled here, never floating.
- The Traefik version is pinned in `infrastructure/cluster/main.tf`
  (`traefik_version` / `traefik_image_tag`).
- **Upgrade them as a set:** bump the Traefik version _and_ this CRD bundle to a
  matching Gateway API version in the same change, tested deliberately — never
  let either side auto-upgrade.
- The Traefik chart line ≥ v40 (v3.7) **removed** its bundled Gateway API CRDs,
  which is why ownership now lives here.

## Updating

```bash
VER=v1.6.0   # example
curl -fsSL https://github.com/kubernetes-sigs/gateway-api/releases/download/$VER/standard-install.yaml \
  -o standard-install.yaml
# bump traefik_version/_image_tag in cluster/main.tf to the matching Traefik release in the SAME PR
```

`prune` is intentionally **false** on the ArgoCD app — these CRDs are
load-bearing; auto-pruning would cascade-delete every Gateway/HTTPRoute.
