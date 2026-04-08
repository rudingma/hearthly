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
  remember_me                    = false

  # Login theme
  login_theme = "hearthly"

  # Token and session lifetimes
  access_token_lifespan = "5m0s"

  # 30-day sessions for all users (no remember-me checkbox)
  sso_session_idle_timeout = "720h0m0s"
  sso_session_max_lifespan = "720h0m0s"
}
