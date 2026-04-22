# syntax=docker/dockerfile:1.7

# Dockerfile for Explorer Curator nudger service
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY attester-core/package.json ./attester-core/package.json
COPY nudger-core/package.json ./nudger-core/package.json
COPY explorer-curator/package.json ./explorer-curator/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY sdk ./sdk
COPY attester-core ./attester-core
COPY nudger-core ./nudger-core
COPY explorer-curator ./explorer-curator
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/attester-core
RUN npm run build --workspace=@commonality/nudger-core
RUN npm run build --workspace=@commonality/explorer-curator

EXPOSE 3004

CMD ["node", "explorer-curator/dist/index.js"]
