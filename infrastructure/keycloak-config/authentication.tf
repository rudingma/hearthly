# --- Social-Only Browser Flow ---
# Custom browser flow that removes the username/password form entirely.
# Only Cookie (session check) and Identity Provider Redirector (kc_idp_hint)
# remain. Users must come through the app with kc_idp_hint — direct Keycloak
# access without a hint shows the custom error page (error.ftl).
#
# Forward-compatible with multiple IdPs (Apple #33): each app button passes
# its own kc_idp_hint, no flow changes needed.

resource "keycloak_authentication_flow" "social_only_browser" {
  realm_id = keycloak_realm.hearthly.id
  alias    = "social-only-browser"
}

resource "keycloak_authentication_execution" "social_browser_cookie" {
  realm_id          = keycloak_realm.hearthly.id
  parent_flow_alias = keycloak_authentication_flow.social_only_browser.alias
  authenticator     = "auth-cookie"
  requirement       = "ALTERNATIVE"
}

resource "keycloak_authentication_execution" "social_browser_idp_redirector" {
  realm_id          = keycloak_realm.hearthly.id
  parent_flow_alias = keycloak_authentication_flow.social_only_browser.alias
  authenticator     = "identity-provider-redirector"
  requirement       = "ALTERNATIVE"

  depends_on = [keycloak_authentication_execution.social_browser_cookie]
}

# Bind the social-only flow as the realm's browser flow.
# Uses keycloak_authentication_bindings (not browser_flow on keycloak_realm)
# to avoid a known cyclic dependency issue in the Terraform provider.
resource "keycloak_authentication_bindings" "browser_binding" {
  realm_id     = keycloak_realm.hearthly.id
  browser_flow = keycloak_authentication_flow.social_only_browser.alias
}
