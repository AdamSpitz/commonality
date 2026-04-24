# syntax=docker/dockerfile:1.7

FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY attester-core/package.json ./attester-core/package.json
COPY implication-attester/package.json ./implication-attester/package.json
COPY content-attester/package.json ./content-attester/package.json
COPY attester-host/package.json ./attester-host/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY sdk ./sdk
COPY attester-core ./attester-core
COPY implication-attester ./implication-attester
COPY content-attester ./content-attester
COPY attester-host ./attester-host
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/attester-core
RUN npm run build --workspace=@commonality/implication-attester
RUN npm run build --workspace=@commonality/content-attester
RUN npm run build --workspace=@commonality/attester-host

EXPOSE 3000

CMD ["node", "attester-host/dist/index.js"]
