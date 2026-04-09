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

# User profile configuration (Keycloak 26+)
# This resource does a full PUT replacement — all default attributes and their
# validators must be defined here, otherwise they are silently dropped.
# The picture attribute is required so the Google IdP mapper can store profile pictures.
resource "keycloak_realm_user_profile" "hearthly" {
  realm_id = keycloak_realm.hearthly.id

  attribute {
    name         = "username"
    display_name = "$${username}"
    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }
    validator {
      name = "length"
      config = {
        min = "3"
        max = "255"
      }
    }
    validator {
      name = "username-prohibited-characters"
    }
    validator {
      name = "up-username-not-idn-homograph"
    }
  }

  attribute {
    name               = "email"
    display_name       = "$${email}"
    required_for_roles = ["user"]
    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }
    validator {
      name = "email"
    }
    validator {
      name = "length"
      config = {
        max = "255"
      }
    }
  }

  attribute {
    name               = "firstName"
    display_name       = "$${firstName}"
    required_for_roles = ["user"]
    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }
    validator {
      name = "length"
      config = {
        max = "255"
      }
    }
    validator {
      name = "person-name-prohibited-characters"
    }
  }

  attribute {
    name               = "lastName"
    display_name       = "$${lastName}"
    required_for_roles = ["user"]
    permissions {
      view = ["admin", "user"]
      edit = ["admin", "user"]
    }
    validator {
      name = "length"
      config = {
        max = "255"
      }
    }
    validator {
      name = "person-name-prohibited-characters"
    }
  }

  attribute {
    name         = "picture"
    display_name = "Profile Picture"
    permissions {
      view = ["admin", "user"]
      edit = ["admin"]
    }
    validator {
      name = "uri"
    }
    validator {
      name = "length"
      config = {
        max = "2048"
      }
    }
  }
}
