# syntax=docker/dockerfile:1.7

# Dockerfile for Bridge Creator nudger service
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY attester-core/package.json ./attester-core/package.json
COPY nudger-core/package.json ./nudger-core/package.json
COPY bridge-creator/package.json ./bridge-creator/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY sdk ./sdk
COPY attester-core ./attester-core
COPY nudger-core ./nudger-core
COPY bridge-creator ./bridge-creator
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/attester-core
RUN npm run build --workspace=@commonality/nudger-core
RUN npm run build --workspace=@commonality/bridge-creator

EXPOSE 3003

CMD ["node", "bridge-creator/dist/index.js"]
