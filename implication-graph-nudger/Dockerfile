# Dockerfile for Implication Graph Nudger service
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY . .

RUN npm ci

RUN cd sdk && npm run build
RUN cd nudger-core && npm run build

RUN cd implication-graph-nudger && npm run build

EXPOSE 3000

CMD ["node", "implication-graph-nudger/dist/index.js"]