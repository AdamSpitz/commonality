# syntax=docker/dockerfile:1.7

FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY attester-core/package.json ./attester-core/package.json
COPY finder-core/package.json ./finder-core/package.json
COPY nudger-core/package.json ./nudger-core/package.json
COPY implication-finder/package.json ./implication-finder/package.json
COPY content-finder/package.json ./content-finder/package.json
COPY implication-graph-nudger/package.json ./implication-graph-nudger/package.json
COPY bridge-creator/package.json ./bridge-creator/package.json
COPY explorer-curator/package.json ./explorer-curator/package.json
COPY worker-host/package.json ./worker-host/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY sdk ./sdk
COPY attester-core ./attester-core
COPY finder-core ./finder-core
COPY nudger-core ./nudger-core
COPY implication-finder ./implication-finder
COPY content-finder ./content-finder
COPY implication-graph-nudger ./implication-graph-nudger
COPY bridge-creator ./bridge-creator
COPY explorer-curator ./explorer-curator
COPY worker-host ./worker-host
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/attester-core
RUN npm run build --workspace=@commonality/finder-core
RUN npm run build --workspace=@commonality/nudger-core
RUN npm run build --workspace=@commonality/implication-finder
RUN npm run build --workspace=@commonality/content-finder
RUN npm run build --workspace=@commonality/implication-graph-nudger
RUN npm run build --workspace=@commonality/bridge-creator
RUN npm run build --workspace=@commonality/explorer-curator
RUN npm run build --workspace=@commonality/worker-host

EXPOSE 3000

CMD ["node", "worker-host/dist/cli.js"]
