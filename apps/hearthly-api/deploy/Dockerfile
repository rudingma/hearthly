# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching. All workspace member package.json
# files must be present before npm ci so npm resolves workspace dependencies.
# Add a COPY line here for each new workspace package that has a package.json.
COPY package.json package-lock.json ./
COPY apps/hearthly-api/package.json ./apps/hearthly-api/
RUN npm ci

# Copy workspace source
COPY . .

# Build, prune production dependencies, and remove source maps
ENV NX_IGNORE_UNSUPPORTED_TS_SETUP=true
RUN npx nx build hearthly-api && npx nx prune hearthly-api && rm -f apps/hearthly-api/dist/*.map

# Production stage
FROM node:24-alpine

LABEL org.opencontainers.image.source=https://github.com/rudingma/hearthly

RUN addgroup -S hearthly && adduser -S hearthly -G hearthly

WORKDIR /app

# Copy built app with pruned package.json and lockfile
COPY --from=builder /app/apps/hearthly-api/dist/ ./

# Strip devDependencies (nx prune includes them in the lockfile) and install
RUN node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); delete p.devDependencies; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))" && \
    npm ci --omit=dev --cache /tmp/npm-cache && rm -rf /tmp/npm-cache

USER hearthly

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "main.js"]
