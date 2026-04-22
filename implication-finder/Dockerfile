# syntax=docker/dockerfile:1.7

# Dockerfile for Implication Finder service
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY finder-core/package.json ./finder-core/package.json
COPY implication-finder/package.json ./implication-finder/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY sdk ./sdk
COPY finder-core ./finder-core
COPY implication-finder ./implication-finder
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/finder-core
RUN npm run build --workspace=@commonality/implication-finder

CMD ["node", "implication-finder/dist/index.js"]
