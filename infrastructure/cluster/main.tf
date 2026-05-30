terraform {
  # use_lockfile (native S3 state locking) requires Terraform >= 1.10.
  required_version = ">= 1.10.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.58.0"
    }
  }

  backend "s3" {
    bucket = "hearthly-tfstate"
    key    = "cluster/terraform.tfstate"
    region = "eu-central"

    endpoints = {
      s3 = "https://nbg1.your-objectstorage.com"
    }

    # Credentials provided via backend.conf (gitignored)
    # Run: terraform init -backend-config=backend.conf

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true

    # Native S3 state locking (Task C.5 / #126): writes a <key>.tflock object
    # via S3 conditional writes — no DynamoDB, state stays in Hetzner. Enforces
    # locking for BOTH CI and manual applies, replacing the convention-only
    # mitigation. NOTE: if Hetzner's Ceph S3 rejects the lock write with
    # `XAmzContentSHA256Mismatch`, add `skip_s3_checksum = true` here (the
    # documented Ceph workaround). Verified by this module's `terraform plan`
    # on PR — a plan only acquires+releases the lock; it never mutates state.
    use_lockfile = true
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

module "kube-hetzner" {
  providers = {
    hcloud = hcloud
  }

  source  = "kube-hetzner/kube-hetzner/hcloud"
  version = "~> 2.19.1"

  hcloud_token = var.hcloud_token

  ssh_public_key  = file(var.ssh_public_key_file)
  ssh_private_key = file(var.ssh_private_key_file)

  network_region = "eu-central"

  load_balancer_type     = "lb11"
  load_balancer_location = "nbg1"

  # 1x CAX11 control plane (single node, sufficient for non-HA learning setup)
  control_plane_nodepools = [
    {
      name        = "control-plane-nbg1"
      server_type = "cax11"
      location    = "nbg1"
      labels      = []
      taints      = []
      count       = 1
    }
  ]

  # 3x CAX11 ARM workers (~12 GB total, ~7.8 GB headroom after system services)
  agent_nodepools = [
    {
      name        = "worker-nbg1"
      server_type = "cax11"
      location    = "nbg1"
      labels      = []
      taints      = []
      count       = 3
    }
  ]

  # Automatic upgrades for k3s and MicroOS
  automatically_upgrade_k3s = true
  automatically_upgrade_os  = true

  # Use stable k3s release channel
  initial_k3s_channel = "stable"

  # PIN Traefik — a load-bearing ingress must never float on a k3s/chart
  # auto-upgrade. An unpinned bump to v3.7.1 (needs Gateway API v1.5.1, TLSRoute
  # Standard at v1) against v1.4.0 CRDs caused the 2026-05-29 ingress outage
  # (zero HTTP routers, all hosts 404). Pinned to the version that is running
  # and healthy. Traefik and the Gateway API CRDs are a COMPATIBILITY SET:
  # bump this together with infrastructure/cluster-services/gateway-api-crds/.
  # See issue #131.
  traefik_version   = "40.2.0"
  traefik_image_tag = "v3.7.1"

  # PIN the add-ons that otherwise float to GitHub "latest" via github_release
  # data sources when unset (data.tf). The module re-renders ALL of these into
  # terraform_data.kustomization; since pinning Traefik forces that kustomization
  # to re-apply, any newly-released hccm/CSI/kured would silently roll in during
  # the same maintenance event — the exact uncontrolled-float class that took
  # ingress down (#131). Pinned to the versions currently running and healthy;
  # bump deliberately. (kured tag has no leading "v"; hccm/CSI tags do.)
  hetzner_ccm_version = "v1.30.1"
  hetzner_csi_version = "v2.20.0"
  kured_version       = "1.21.0"

  # Give the CSI driver system-cluster-critical priority so kubelet evicts it
  # LAST under node pressure. During the 2026-05 outage the CSI node plugin was
  # evicted -> the driver deregistered from kubelet -> PVs could not attach
  # (issue #131). controller (provisioning) and node (attach/mount) both matter.
  # NOTE: setting hetzner_csi_values REPLACES the module default (locals.tf, which
  # is ONLY the node affinity), so the control-plane + robot exclusion is
  # replicated here verbatim (we do not schedule on the control plane). Chart
  # v2.20.0 exposes controller.priorityClassName + node.priorityClassName.
  # Architecture plan C.2.
  hetzner_csi_values = <<-EOT
controller:
  priorityClassName: system-cluster-critical
node:
  priorityClassName: system-cluster-critical
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: "node-role.kubernetes.io/control-plane"
                operator: DoesNotExist
              - key: "instance.hetzner.cloud/provided-by"
                operator: NotIn
                values:
                  - robot
EOT

  # Gateway API: enable Traefik's kubernetesGateway provider.
  # CRDs are owned explicitly by the gateway-api-crds ArgoCD app (the v40 chart
  # no longer bundles them); cert-manager Gateway API support is enabled
  # automatically by kube-hetzner when this flag is set.
  traefik_provider_kubernetes_gateway_enabled = true

  # Deep-merge into defaults (preserves LB annotations, proxy protocol,
  # resource limits, PDB that traefik_values would silently drop).
  traefik_merge_values = <<-EOT
providers:
  kubernetesGateway:
    enabled: true
    # Hearthly uses only HTTPRoute. false keeps TCPRoute out of the watch set.
    # (TLSRoute is Standard in Gateway API v1.5, so this does not exclude it —
    # that is satisfied by the owned v1.5.1 CRDs, not by this flag.)
    experimentalChannel: false
gateway:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  listeners:
    websecure-app:
      port: 8443
      hostname: hearthly.dev
      protocol: HTTPS
      mode: Terminate
      namespacePolicy:
        from: All
      certificateRefs:
        - name: hearthly-app-tls
    websecure-api:
      port: 8443
      hostname: api.hearthly.dev
      protocol: HTTPS
      mode: Terminate
      namespacePolicy:
        from: All
      certificateRefs:
        - name: hearthly-api-tls
    websecure-auth:
      port: 8443
      hostname: auth.hearthly.dev
      protocol: HTTPS
      mode: Terminate
      namespacePolicy:
        from: All
      certificateRefs:
        - name: keycloak-tls
    websecure-argocd:
      port: 8443
      hostname: argocd.hearthly.dev
      protocol: HTTPS
      mode: Terminate
      namespacePolicy:
        from: All
      certificateRefs:
        - name: argocd-tls
    websecure-grafana:
      port: 8443
      hostname: grafana.hearthly.dev
      protocol: HTTPS
      mode: Terminate
      namespacePolicy:
        from: All
      certificateRefs:
        - name: grafana-tls
    websecure-secrets:
      port: 8443
      hostname: secrets.hearthly.dev
      protocol: HTTPS
      mode: Terminate
      namespacePolicy:
        from: All
      certificateRefs:
        - name: infisical-tls
EOT
}
