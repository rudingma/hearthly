# Build stage
FROM node:24-alpine AS builder

# Install Bun (package manager only — Node.js runs builds)
COPY --from=oven/bun:1.2.20-alpine /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Copy package files first for layer caching. All workspace member package.json
# files must be present before bun install so it resolves workspace dependencies.
# Add a COPY line here for each new workspace package that has a package.json.
COPY package.json bun.lock ./
COPY apps/hearthly-api/package.json ./apps/hearthly-api/
COPY apps/hearthly-api-e2e/package.json ./apps/hearthly-api-e2e/
COPY apps/hearthly-app-e2e/package.json ./apps/hearthly-app-e2e/
COPY scripts/ ./scripts/
RUN bun install --frozen-lockfile

# Copy workspace source
COPY . .

# Build, prune production dependencies, generate lockfile for prod, and remove source maps.
# nx prune outputs package.json with semver ranges — generate a lockfile so production
# installs are deterministic (bun's prune-lockfile executor doesn't support bun.lock yet).
ENV NX_IGNORE_UNSUPPORTED_TS_SETUP=true
RUN npx nx build hearthly-api && npx nx prune hearthly-api && rm -f apps/hearthly-api/dist/*.map && \
    cd apps/hearthly-api/dist && \
    bun -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); delete p.devDependencies; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))" && \
    bun install --production

# Production stage — Bun runtime (pinned version, upgrade intentionally)
FROM oven/bun:1.2.20-alpine

LABEL org.opencontainers.image.source=https://github.com/rudingma/hearthly

# Pull Alpine security patches (base image may lag behind)
USER root
RUN apk upgrade --no-cache && addgroup -S hearthly && adduser -S hearthly -G hearthly

WORKDIR /app

# Copy pruned output with lockfile and pre-installed production node_modules
COPY --from=builder /app/apps/hearthly-api/dist/ ./

USER hearthly

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "main.js"]

