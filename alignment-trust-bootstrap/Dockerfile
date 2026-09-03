# syntax=docker/dockerfile:1.7
FROM node:24.14.1-alpine
ARG NPM_VERSION=11.16.0
RUN npm install -g npm@${NPM_VERSION} && apk add --no-cache python3 make g++
WORKDIR /workspace

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY alignment-trust-bootstrap/package.json ./alignment-trust-bootstrap/package.json
RUN --mount=type=cache,target=/root/.npm HUSKY=0 npm ci --legacy-peer-deps

COPY sdk ./sdk
COPY alignment-trust-bootstrap ./alignment-trust-bootstrap
RUN npm run build --workspace=@commonality/sdk \
  && npm run build --workspace=@commonality/alignment-trust-bootstrap \
  && chmod +x alignment-trust-bootstrap/docker-entrypoint.sh
ENTRYPOINT ["alignment-trust-bootstrap/docker-entrypoint.sh"]
CMD ["node", "alignment-trust-bootstrap/dist/src/index.js"]
