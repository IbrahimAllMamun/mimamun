# syntax=docker/dockerfile:1.7
# API image. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t portfolio-api .

ARG NODE_IMAGE=node:22-bookworm-slim

# ── Build: install workspace dependencies and bundle the API with esbuild ──
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace=@portfolio/api --include-workspace-root=false --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @portfolio/api

# ── Runtime dependencies only (the bundle keeps npm packages external) ──
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --workspace=@portfolio/api --include-workspace-root=false --no-audit --no-fund

# ── Runtime ──
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    UPLOAD_DIR=/data/uploads
WORKDIR /app/apps/api
COPY --from=prod-deps /app/node_modules /app/node_modules
# package.json, plus any dependencies npm could not hoist
COPY --from=prod-deps /app/apps/api ./
COPY --from=build /app/apps/api/dist ./dist
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 4000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]
