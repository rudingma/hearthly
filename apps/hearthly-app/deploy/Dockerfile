# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching. All workspace member package.json
# files must be present before npm ci so npm resolves workspace dependencies.
# Add a COPY line here for each new workspace package that has a package.json.
COPY package.json package-lock.json ./
COPY apps/hearthly-api/package.json ./apps/hearthly-api/
COPY scripts/ ./scripts/
RUN npm ci

# Copy workspace source
COPY . .

# Build Angular app (production config is default)
ENV NX_IGNORE_UNSUPPORTED_TS_SETUP=true
RUN npx nx build hearthly-app

# Production stage (runs as non-root user nginx, UID 101)
FROM nginxinc/nginx-unprivileged:alpine

LABEL org.opencontainers.image.source=https://github.com/rudingma/hearthly

# Pull Alpine security patches (base image may lag behind)
USER root
RUN apk upgrade --no-cache
USER nginx

# envsubst template config:
# - NGINX_ENVSUBST_OUTPUT_DIR: process template to /etc/nginx/ (replaces main nginx.conf)
# - NGINX_ENVSUBST_FILTER: only substitute CSP_* vars (protects nginx vars like $uri)
# - CSP defaults: safety net if Helm env vars are misconfigured
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx \
    NGINX_ENVSUBST_FILTER="^CSP_" \
    CSP_API_ORIGIN="https://api.hearthly.dev" \
    CSP_AUTH_ORIGIN="https://auth.hearthly.dev"

# Copy nginx template and built static files
COPY apps/hearthly-app/deploy/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY --from=builder /app/dist/apps/hearthly-app/browser/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
