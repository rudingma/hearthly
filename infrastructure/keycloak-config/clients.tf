resource "keycloak_openid_client" "hearthly_app" {
  realm_id  = keycloak_realm.hearthly.id
  client_id = "hearthly-app"
  name      = "Hearthly App"
  enabled   = true

  # Public client (SPA — no client secret)
  access_type = "PUBLIC"

  # Authorization Code flow with PKCE
  standard_flow_enabled        = true
  direct_access_grants_enabled = false
  implicit_flow_enabled        = false
  pkce_code_challenge_method   = "S256"

  # Redirect URIs
  valid_redirect_uris = [
    "https://hearthly.dev/*",
    "http://localhost:4200/*",
    "capacitor://localhost/*",
  ]

  valid_post_logout_redirect_uris = [
    "https://hearthly.dev/*",
    "http://localhost:4200/*",
    "capacitor://localhost/*",
  ]

  # CORS
  web_origins = [
    "https://hearthly.dev",
    "http://localhost:4200",
  ]
}
