# syntax=docker/dockerfile:1.7

FROM node:24.14.1-alpine

ARG NPM_VERSION=11.16.0
RUN npm install -g npm@${NPM_VERSION} \
  && apk add --no-cache curl python3 make g++

WORKDIR /app

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
COPY ui/package.json ./ui/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY sdk ./sdk
COPY attester-core ./attester-core
COPY finder-core ./finder-core
COPY nudger-core ./nudger-core
COPY implication-attester ./implication-attester
COPY content-attester ./content-attester
COPY beat-memory ./beat-memory
COPY beat-agent ./beat-agent
COPY implication-finder ./implication-finder
COPY content-finder ./content-finder
COPY implication-graph-nudger ./implication-graph-nudger
COPY bridge-creator ./bridge-creator
COPY explorer-curator ./explorer-curator
COPY service-host ./service-host
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/attester-core
RUN npm run build --workspace=@commonality/finder-core
RUN npm run build --workspace=@commonality/nudger-core
RUN npm run build --workspace=@commonality/implication-attester
RUN npm run build --workspace=@commonality/content-attester
RUN npm run build --workspace=@commonality/beat-memory
RUN npm run build --workspace=@commonality/beat-agent
RUN npm run build --workspace=@commonality/implication-finder
RUN npm run build --workspace=@commonality/content-finder
RUN npm run build --workspace=@commonality/implication-graph-nudger
RUN npm run build --workspace=@commonality/bridge-creator
RUN npm run build --workspace=@commonality/explorer-curator
RUN npm run build --workspace=@commonality/service-host

EXPOSE 3000

CMD ["node", "service-host/dist/src/cli.js"]
