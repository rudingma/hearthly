resource "keycloak_realm" "hearthly" {
  realm        = "hearthly"
  enabled      = true
  display_name = "Hearthly"

  # Login settings
  registration_allowed           = true
  registration_email_as_username = true
  login_with_email_allowed       = true
  duplicate_emails_allowed       = false
  reset_password_allowed         = true
  remember_me                    = true

  # Token and session lifetimes
  access_token_lifespan = "5m0s"

  # Normal sessions
  sso_session_idle_timeout = "24h0m0s"
  sso_session_max_lifespan = "72h0m0s"

  # Remember-me sessions (30 days)
  sso_session_idle_timeout_remember_me = "720h0m0s"
  sso_session_max_lifespan_remember_me = "720h0m0s"
}
