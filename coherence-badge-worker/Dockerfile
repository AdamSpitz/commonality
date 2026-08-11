# syntax=docker/dockerfile:1.7
FROM node:24.14.1-alpine
ARG NPM_VERSION=11.16.0
RUN npm install -g npm@${NPM_VERSION} && apk add --no-cache python3 make g++
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
COPY coherence-badge-worker/package.json ./coherence-badge-worker/package.json
COPY cause-assist/package.json ./cause-assist/package.json
COPY ui/package.json ./ui/package.json
COPY causestarter/package.json ./causestarter/package.json
RUN --mount=type=cache,target=/root/.npm HUSKY=0 npm ci --legacy-peer-deps

COPY sdk ./sdk
COPY services/attester-core ./services/attester-core
COPY services/implication-attester ./services/implication-attester
COPY services/nudger-core ./services/nudger-core
COPY services/bridge-creator ./services/bridge-creator
COPY cause-assist ./cause-assist
COPY coherence-badge-worker ./coherence-badge-worker
RUN npm run build --workspace=@commonality/sdk \
  && npm run build --workspace=@commonality/attester-core \
  && npm run build --workspace=@commonality/implication-attester \
  && npm run build --workspace=@commonality/nudger-core \
  && npm run build --workspace=@commonality/bridge-creator \
  && npm run build --workspace=@commonality/cause-assist \
  && npm run build --workspace=@commonality/coherence-badge-worker \
  && chmod +x coherence-badge-worker/docker-entrypoint.sh
ENTRYPOINT ["coherence-badge-worker/docker-entrypoint.sh"]
CMD ["node", "coherence-badge-worker/dist/src/index.js"]
