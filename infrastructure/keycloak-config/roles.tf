resource "keycloak_role" "user" {
  realm_id    = keycloak_realm.hearthly.id
  name        = "user"
  description = "Default role for all registered Hearthly users"
}

resource "keycloak_default_roles" "default_roles" {
  realm_id = keycloak_realm.hearthly.id

  # Preserve Keycloak built-in defaults alongside the new "user" role
  default_roles = [
    "offline_access",
    "uma_authorization",
    keycloak_role.user.name,
  ]
}
