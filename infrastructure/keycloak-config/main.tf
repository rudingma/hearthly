terraform {
  required_version = ">= 1.5.0"
  required_providers {
    keycloak = {
      source  = "mrparkers/keycloak"
      version = ">= 4.0.0"
    }
  }

  backend "s3" {
    bucket = "hearthly-tfstate"
    key    = "keycloak-config/terraform.tfstate"
    region = "eu-central"

    endpoints = {
      s3 = "https://nbg1.your-objectstorage.com"
    }

    # Credentials provided via backend.conf (gitignored)
    # Run: terraform init -backend-config=backend.conf

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true
  }
}

provider "keycloak" {
  client_id = "admin-cli"
  url       = var.keycloak_url
  username  = var.keycloak_admin_user
  password  = var.keycloak_admin_password
}
