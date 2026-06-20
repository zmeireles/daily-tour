# syntax=docker/dockerfile:1.7
#
# PWA qual image — build the React 19 + Vite 6 bundle on a GitHub runner, then
# serve the static dist from nginx (Plan-007 Q.2.4). The VPS never builds; it
# pulls ghcr.io/zmeireles/daily-tour/pwa. Build context = repo root (pnpm
# workspace), mirroring services/bff/Dockerfile.

# ─── deps: install workspace deps (cached layer) ─────────────────────────
FROM node:22.22.3-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared-config/package.json packages/shared-config/
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/pwa/package.json apps/pwa/
# pwa... = the pwa plus its workspace deps (shared-types runtime, shared-config
# dev). devDeps (vite, tsc, tailwind) install too — no --prod here, we build.
RUN pnpm install --frozen-lockfile --filter @daily-tour/pwa...

# ─── build: build shared-types (tsup → dist), then bundle the PWA (vite) ──
# VITE_* are inlined into the bundle at build time (import.meta.env), so they
# MUST be present here, not at runtime. Promote the build args to ENV before
# the vite build reads them.
FROM deps AS build
ARG VITE_AUTHENTIK_URL
ARG VITE_BFF_URL
ARG VITE_SENTRY_DSN
ENV VITE_AUTHENTIK_URL=$VITE_AUTHENTIK_URL
ENV VITE_BFF_URL=$VITE_BFF_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
COPY tsconfig.base.json ./
COPY packages/shared-config/ packages/shared-config/
COPY packages/shared-types/ packages/shared-types/
COPY apps/pwa/ apps/pwa/
# shared-types is consumed via its built dist (main: ./dist/index.js), and the
# PWA's `tsc --noEmit` resolves its .d.ts — so build it first.
RUN pnpm --filter @daily-tour/shared-types build \
 && pnpm --filter @daily-tour/pwa build

# ─── runtime: nginx serving the built SPA ─────────────────────────────────
# conf is image-baked (writable), so nginx's entrypoint can add the IPv6
# listener; the compose /healthz 127.0.0.1 healthcheck keeps working.
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/pwa/dist /usr/share/nginx/html
COPY infra/nginx/pwa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
