# Dockerfile for Implication Graph Nudger service
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY nudger-core/package.json ./nudger-core/package.json
COPY implication-graph-nudger/package.json ./implication-graph-nudger/package.json
RUN npm ci
COPY sdk ./sdk
COPY nudger-core ./nudger-core
COPY implication-graph-nudger ./implication-graph-nudger
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/nudger-core
RUN npm run build --workspace=@commonality/implication-graph-nudger

EXPOSE 3000

CMD ["node", "implication-graph-nudger/dist/index.js"]
