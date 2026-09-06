# Optional Cloudflare zone settings via Terraform
# terraform init && terraform apply
#
# export CLOUDFLARE_API_TOKEN=...
# terraform.tfvars:
#   zone_id = "..."
#   domain  = "example.com"

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "zone_id" { type = string }
variable "domain" { type = string }

provider "cloudflare" {}

resource "cloudflare_zone_settings_override" "somluul" {
  zone_id = var.zone_id
  settings {
    ssl                      = "strict"
    always_use_https         = "on"
    min_tls_version          = "1.2"
    automatic_https_rewrites = "on"
    brotli                   = "on"
  }
}

# Example: cache everything under /assets/
resource "cloudflare_ruleset" "cache_assets" {
  zone_id     = var.zone_id
  name        = "somluul-cache-assets"
  kind        = "zone"
  phase       = "http_request_cache_settings"
  description = "Cache static assets"

  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 2678400
      }
    }
    expression  = "(starts_with(http.request.uri.path, \"/assets/\"))"
    description = "Cache /assets/"
    enabled     = true
  }
}
