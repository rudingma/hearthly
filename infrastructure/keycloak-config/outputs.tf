output "oidc_issuer_url" {
  description = "OIDC issuer URL for JWT validation"
  value       = "${var.keycloak_url}/realms/${keycloak_realm.hearthly.realm}"
}

output "client_id" {
  description = "OIDC client ID for the frontend app"
  value       = keycloak_openid_client.hearthly_app.client_id
}

output "jwks_uri" {
  description = "JWKS endpoint for backend JWT validation"
  value       = "${var.keycloak_url}/realms/${keycloak_realm.hearthly.realm}/protocol/openid-connect/certs"
}
