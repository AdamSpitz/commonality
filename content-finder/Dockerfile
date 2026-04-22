# syntax=docker/dockerfile:1.7

# Dockerfile for Content Finder service
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY finder-core/package.json ./finder-core/package.json
COPY content-finder/package.json ./content-finder/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY sdk ./sdk
COPY finder-core ./finder-core
COPY content-finder ./content-finder
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/finder-core
RUN npm run build --workspace=@commonality/content-finder

CMD ["node", "content-finder/dist/index.js"]
