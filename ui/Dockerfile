FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /workspace
COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY ui/package.json ./ui/package.json
RUN HUSKY=0 npm ci --legacy-peer-deps
COPY sdk ./sdk
COPY ui ./ui
COPY scripts ./scripts
RUN chmod -R a+rwX /workspace

CMD ["node", "scripts/publish-ui-to-ipfs.mjs"]

EXPOSE 5173
