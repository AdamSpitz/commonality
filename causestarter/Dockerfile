# syntax=docker/dockerfile:1.7
#
# Multi-stage build for CauseStarter.
# Builder compiles SDK + SPA; runtime is nginx serving the static bundle with a
# small entrypoint that writes config.json from environment variables.

FROM node:24.14.1-alpine AS builder

ARG NPM_VERSION=11.16.0
RUN npm install -g npm@${NPM_VERSION} \
  && apk add --no-cache python3 make g++

WORKDIR /workspace

# Workspace manifests first for better layer caching.
COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY integration-tests/package.json ./integration-tests/package.json
COPY hardhat/package.json ./hardhat/package.json
COPY indexer/package.json ./indexer/package.json
COPY attester-core/package.json ./attester-core/package.json
COPY finder-core/package.json ./finder-core/package.json
COPY implication-attester/package.json ./implication-attester/package.json
COPY content-attester/package.json ./content-attester/package.json
COPY beat-memory/package.json ./beat-memory/package.json
COPY beat-agent/package.json ./beat-agent/package.json
COPY implication-finder/package.json ./implication-finder/package.json
COPY content-finder/package.json ./content-finder/package.json
COPY service-host/package.json ./service-host/package.json
COPY platform-api-service/package.json ./platform-api-service/package.json
COPY fake-data-generation/package.json ./fake-data-generation/package.json
COPY nudger-core/package.json ./nudger-core/package.json
COPY implication-graph-nudger/package.json ./implication-graph-nudger/package.json
COPY bridge-creator/package.json ./bridge-creator/package.json
COPY explorer-curator/package.json ./explorer-curator/package.json
COPY published-data-ipfs-mirror/package.json ./published-data-ipfs-mirror/package.json
COPY cause-assist/package.json ./cause-assist/package.json
COPY ui/package.json ./ui/package.json
COPY causestarter/package.json ./causestarter/package.json
COPY turbo.json ./turbo.json

RUN --mount=type=cache,target=/root/.npm HUSKY=0 npm ci --legacy-peer-deps

COPY sdk ./sdk
COPY causestarter ./causestarter

# Optional build-time Vite defines (runtime config.json is preferred for contracts).
# WalletConnect project id MUST be available at vite build time (import.meta.env).
ARG VITE_HASH_ROUTING=true
ARG VITE_WALLETCONNECT_PROJECT_ID=
ENV VITE_HASH_ROUTING=${VITE_HASH_ROUTING}
ENV VITE_WALLETCONNECT_PROJECT_ID=${VITE_WALLETCONNECT_PROJECT_ID}
ENV HUSKY=0

RUN npm run build --workspace=@commonality/sdk \
  && npm run build --workspace=causestarter

# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY causestarter/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/causestarter/dist /usr/share/nginx/html
COPY causestarter/docker-entrypoint.d/30-indexer-upstream.sh /docker-entrypoint.d/30-indexer-upstream.sh
COPY causestarter/docker-entrypoint.d/35-ipfs-upstream.sh /docker-entrypoint.d/35-ipfs-upstream.sh
COPY causestarter/docker-entrypoint.d/40-causestarter-config.sh /docker-entrypoint.d/40-causestarter-config.sh
RUN chmod +x /docker-entrypoint.d/30-indexer-upstream.sh \
      /docker-entrypoint.d/35-ipfs-upstream.sh \
      /docker-entrypoint.d/40-causestarter-config.sh \
  && apk add --no-cache wget \
  && chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
