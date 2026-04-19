# Dockerfile for Content Attester service
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY attester-core/package.json ./attester-core/package.json
COPY content-attester/package.json ./content-attester/package.json
RUN npm ci
COPY sdk ./sdk
COPY attester-core ./attester-core
COPY content-attester ./content-attester
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/attester-core
RUN npm run build --workspace=@commonality/content-attester

EXPOSE 3000

CMD ["node", "content-attester/dist/index.js"]
