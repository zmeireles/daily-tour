# syntax=docker/dockerfile:1.7

# ─── deps: install workspace deps (cached layer) ─────────────────────────
FROM node:22.22.3-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared-config/package.json packages/shared-config/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-otel/package.json packages/shared-otel/
COPY packages/shared-sentry/package.json packages/shared-sentry/
COPY services/token-svc/package.json services/token-svc/
RUN pnpm install --frozen-lockfile \
    --filter @daily-tour/token-svc... \
    --filter @daily-tour/shared-types \
    --filter @daily-tour/shared-otel \
    --filter @daily-tour/shared-sentry

# ─── build: bundle token-svc; OTel stays external ────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared-config/ packages/shared-config/
COPY packages/shared-types/ packages/shared-types/
COPY packages/shared-otel/ packages/shared-otel/
COPY packages/shared-sentry/ packages/shared-sentry/
COPY services/token-svc/ services/token-svc/
RUN pnpm --filter @daily-tour/shared-types build \
 && pnpm --filter @daily-tour/shared-otel build \
 && pnpm --filter @daily-tour/shared-sentry build \
 && pnpm --filter @daily-tour/token-svc build

# ─── deploy: hoisted prod-only node_modules for the runtime image ─────────
FROM build AS deploy
WORKDIR /repo
RUN pnpm --filter @daily-tour/token-svc deploy --prod /repo/__deploy__/token-svc

# ─── runtime: minimal runtime layer ───────────────────────────────────────
FROM node:22.22.3-alpine AS runtime
RUN apk add --no-cache tini \
 && addgroup -S app && adduser -S -G app app
WORKDIR /app
USER app
COPY --from=deploy --chown=app:app /repo/__deploy__/token-svc/dist /app/dist
COPY --from=deploy --chown=app:app /repo/__deploy__/token-svc/node_modules /app/node_modules
COPY --from=deploy --chown=app:app /repo/__deploy__/token-svc/package.json /app/package.json
# The drizzle migrator at startup reads from /app/drizzle/migrations.
COPY --from=build --chown=app:app /repo/services/token-svc/drizzle/migrations /app/drizzle/migrations
ENV NODE_ENV=production
EXPOSE 8088
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
