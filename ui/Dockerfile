FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /workspace
COPY . .
RUN HUSKY=0 npm ci --legacy-peer-deps
RUN chmod -R a+rwX /workspace

CMD ["node", "scripts/publish-ui-to-ipfs.mjs"]

EXPOSE 5173
