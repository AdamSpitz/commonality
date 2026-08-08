# syntax=docker/dockerfile:1.7
#
# cause-assist uses @commonality/attester-core for the shared LLM client.
# Build from monorepo context so workspace resolution matches other services.

FROM node:24.14.1-alpine AS builder

ARG NPM_VERSION=11.16.0
RUN npm install -g npm@${NPM_VERSION} \
  && apk add --no-cache python3 make g++

WORKDIR /workspace

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY integration-tests/package.json ./integration-tests/package.json
COPY hardhat/package.json ./hardhat/package.json
COPY indexer/package.json ./indexer/package.json
COPY services/attester-core/package.json ./services/attester-core/package.json
COPY services/finder-core/package.json ./services/finder-core/package.json
COPY services/implication-attester/package.json ./services/implication-attester/package.json
COPY services/content-attester/package.json ./services/content-attester/package.json
COPY services/beat-memory/package.json ./services/beat-memory/package.json
COPY services/beat-agent/package.json ./services/beat-agent/package.json
COPY services/implication-finder/package.json ./services/implication-finder/package.json
COPY services/content-finder/package.json ./services/content-finder/package.json
COPY service-host/package.json ./service-host/package.json
COPY platform-api-service/package.json ./platform-api-service/package.json
COPY fake-data-generation/package.json ./fake-data-generation/package.json
COPY services/nudger-core/package.json ./services/nudger-core/package.json
COPY services/implication-graph-nudger/package.json ./services/implication-graph-nudger/package.json
COPY services/bridge-creator/package.json ./services/bridge-creator/package.json
COPY services/explorer-curator/package.json ./services/explorer-curator/package.json
COPY published-data-ipfs-mirror/package.json ./published-data-ipfs-mirror/package.json
COPY cause-assist/package.json ./cause-assist/package.json
COPY ui/package.json ./ui/package.json
COPY causestarter/package.json ./causestarter/package.json
COPY turbo.json ./turbo.json

RUN --mount=type=cache,target=/root/.npm HUSKY=0 npm ci --legacy-peer-deps

COPY services/attester-core ./services/attester-core
COPY cause-assist ./cause-assist

ENV HUSKY=0
RUN npm run build --workspace=@commonality/attester-core \
  && npm run build --workspace=@commonality/cause-assist

FROM node:24.14.1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /workspace/cause-assist/package.json ./package.json
COPY --from=builder /workspace/cause-assist/dist ./dist

# Production node_modules from the monorepo install, then materialize workspace
# packages (symlinks in the builder tree do not survive a slim runtime layout).
COPY --from=builder /workspace/node_modules ./node_modules
RUN rm -rf ./node_modules/@commonality/attester-core \
  && mkdir -p ./node_modules/@commonality/attester-core
COPY --from=builder /workspace/services/attester-core/package.json ./node_modules/@commonality/attester-core/package.json
COPY --from=builder /workspace/services/attester-core/dist ./node_modules/@commonality/attester-core/dist

EXPOSE 3002
CMD ["node", "dist/index.js"]
