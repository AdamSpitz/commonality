# syntax=docker/dockerfile:1.7

FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /workspace
COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY ui/package.json ./ui/package.json
RUN --mount=type=cache,target=/root/.npm HUSKY=0 npm ci --legacy-peer-deps
COPY sdk ./sdk
COPY ui ./ui
COPY scripts ./scripts
RUN mkdir -p /workspace/ui/dist /workspace/ui/node_modules/.tmp \
  && chmod -R a+rwX /workspace/ui/dist /workspace/ui/node_modules/.tmp

CMD ["node", "scripts/publish-ui-to-ipfs.mjs"]

EXPOSE 5173
