terraform {
  required_version = ">= 1.5.0"
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
  version = "~> 2.18.1"

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

  # Gateway API: enable Traefik's kubernetesGateway provider.
  # CRDs are bundled by the Traefik Helm chart; cert-manager Gateway API
  # support is enabled automatically by kube-hetzner when this flag is set.
  traefik_provider_kubernetes_gateway_enabled = true

  # Deep-merge into defaults (preserves LB annotations, proxy protocol,
  # resource limits, PDB that traefik_values would silently drop).
  traefik_merge_values = <<-EOT
ports:
  web:
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
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
