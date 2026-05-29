# syntax=docker/dockerfile:1.7

FROM node:24-alpine

RUN apk add --no-cache curl python3 make g++

WORKDIR /workspace
COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY ui/package.json ./ui/package.json
COPY turbo.json ./turbo.json
RUN --mount=type=cache,target=/root/.npm HUSKY=0 npm ci --legacy-peer-deps
COPY sdk ./sdk
COPY docs ./docs
COPY ui ./ui
COPY scripts ./scripts
RUN chmod -R a+rX /workspace/sdk /workspace/docs /workspace/ui /workspace/scripts \
  && mkdir -p /workspace/sdk/.turbo /workspace/sdk/dist /workspace/sdk/src/generated \
    /workspace/ui/.turbo /workspace/ui/dist /workspace/ui/node_modules/.tmp /workspace/ui/node_modules/.vite-temp \
    /workspace/.turbo/cache /tmp/node-compile-cache \
  && chmod -R a+rwX /workspace/sdk/.turbo /workspace/sdk/dist /workspace/sdk/src/generated \
    /workspace/ui/.turbo /workspace/ui/dist /workspace/ui/node_modules/.tmp /workspace/ui/node_modules/.vite-temp \
    /workspace/.turbo /tmp/node-compile-cache

CMD ["node", "scripts/publish-ui-to-ipfs.mjs"]

EXPOSE 5173
