variable "keycloak_url" {
  description = "Keycloak base URL (e.g., https://auth.hearthly.dev)"
  type        = string
  default     = "https://auth.hearthly.dev"
}

variable "keycloak_admin_user" {
  description = "Keycloak admin username"
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "Keycloak admin password (set via TF_VAR_keycloak_admin_password env var)"
  type        = string
  sensitive   = true
}

# Google Identity Provider
variable "google_client_id" {
  description = "Google OAuth 2.0 client ID (from Google Cloud Console)"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth 2.0 client secret (set via TF_VAR_google_client_secret env var)"
  type        = string
  sensitive   = true
}
