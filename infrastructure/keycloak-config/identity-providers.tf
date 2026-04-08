# --- Auto-Link Authentication Flow ---
# Automatically links social login to existing accounts with matching email.
# Used as the first-broker-login flow for all social IdPs.

resource "keycloak_authentication_flow" "auto_link" {
  realm_id = keycloak_realm.hearthly.id
  alias    = "first-broker-auto-link"
}

resource "keycloak_authentication_execution" "detect_existing" {
  realm_id          = keycloak_realm.hearthly.id
  parent_flow_alias = keycloak_authentication_flow.auto_link.alias
  authenticator     = "idp-detect-existing-broker-user"
  requirement       = "REQUIRED"
}

resource "keycloak_authentication_execution" "auto_link" {
  realm_id          = keycloak_realm.hearthly.id
  parent_flow_alias = keycloak_authentication_flow.auto_link.alias
  authenticator     = "idp-auto-link"
  requirement       = "REQUIRED"

  depends_on = [keycloak_authentication_execution.detect_existing]
}

# --- Google Identity Provider ---

resource "keycloak_oidc_google_identity_provider" "google" {
  realm         = keycloak_realm.hearthly.id
  client_id     = var.google_client_id
  client_secret = var.google_client_secret

  trust_email   = true
  sync_mode     = "FORCE"

  default_scopes = "openid email profile"

  first_broker_login_flow_alias = keycloak_authentication_flow.auto_link.alias
}

# --- Mappers ---

# Import Google's profile picture into Keycloak user attributes
resource "keycloak_attribute_importer_identity_provider_mapper" "google_picture" {
  realm                   = keycloak_realm.hearthly.id
  name                    = "picture-attribute-importer"
  identity_provider_alias = keycloak_oidc_google_identity_provider.google.alias
  claim_name              = "picture"
  user_attribute          = "picture"

  extra_config = {
    syncMode = "INHERIT"
  }
}

# Expose the picture user attribute as a JWT claim on the hearthly-app client
resource "keycloak_openid_user_attribute_protocol_mapper" "picture_claim" {
  realm_id  = keycloak_realm.hearthly.id
  client_id = keycloak_openid_client.hearthly_app.id
  name      = "picture-token-mapper"

  user_attribute   = "picture"
  claim_name       = "picture"
  claim_value_type = "String"

  add_to_access_token = true
  add_to_id_token     = false
  add_to_userinfo     = true
}
