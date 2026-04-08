# Dockerfile for Content Attester service
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY . .

RUN npm ci

RUN cd sdk && npm run build
RUN cd attester-core && npm run build

RUN cd content-attester && npm run build

EXPOSE 3000

CMD ["node", "content-attester/dist/index.js"]
