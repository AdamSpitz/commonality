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
COPY platform-api-service ./platform-api-service
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/platform-api-service

EXPOSE 3001

CMD ["node", "platform-api-service/dist/index.js"]
