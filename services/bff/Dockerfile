# syntax=docker/dockerfile:1.7

# ─── deps: install workspace deps (cached layer) ─────────────────────────
FROM node:22.22.3-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared-config/package.json packages/shared-config/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-otel/package.json packages/shared-otel/
COPY services/bff/package.json services/bff/
RUN pnpm install --frozen-lockfile \
    --filter @daily-tour/bff... \
    --filter @daily-tour/shared-types \
    --filter @daily-tour/shared-otel

# ─── build: bundle BFF; OTel + fastify stay external ─────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared-config/ packages/shared-config/
COPY packages/shared-types/ packages/shared-types/
COPY packages/shared-otel/ packages/shared-otel/
COPY services/bff/ services/bff/
RUN pnpm --filter @daily-tour/shared-types build \
 && pnpm --filter @daily-tour/shared-otel build \
 && pnpm --filter @daily-tour/bff build

# ─── deploy: hoisted prod-only node_modules for the runtime image ─────────
# pnpm deploy collapses workspace deps + writes a flat node_modules so the
# runtime image needs neither pnpm nor the monorepo layout.
# Target lives under /repo to dodge a pnpm 9 absolute-path quirk.
FROM build AS deploy
WORKDIR /repo
RUN pnpm --filter @daily-tour/bff deploy --prod /repo/__deploy__/bff

# ─── runtime: minimal runtime layer ───────────────────────────────────────
FROM node:22.22.3-alpine AS runtime
RUN apk add --no-cache tini \
 && addgroup -S app && adduser -S -G app app
WORKDIR /app
USER app
COPY --from=deploy --chown=app:app /repo/__deploy__/bff/dist /app/dist
COPY --from=deploy --chown=app:app /repo/__deploy__/bff/node_modules /app/node_modules
COPY --from=deploy --chown=app:app /repo/__deploy__/bff/package.json /app/package.json
ENV NODE_ENV=production
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
