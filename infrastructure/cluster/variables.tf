variable "hcloud_token" {
  description = "Hetzner Cloud API token (set via TF_VAR_hcloud_token env var)"
  type        = string
  sensitive   = true
}

variable "ssh_public_key_file" {
  description = "Path to SSH public key file"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_private_key_file" {
  description = "Path to SSH private key file"
  type        = string
  default     = "~/.ssh/id_ed25519"
}
