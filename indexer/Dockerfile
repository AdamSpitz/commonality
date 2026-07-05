# syntax=docker/dockerfile:1.7

# Dockerfile for Ponder indexer
FROM node:24.14.1-alpine

ARG NPM_VERSION=11.16.0
RUN npm install -g npm@${NPM_VERSION}

# Install curl for healthcheck and native addon build prerequisites for npm install
RUN apk add --no-cache curl python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm install

# Copy source code
COPY . .

# Allow any user to write to /app (needed when running as non-root via
# user: "${UID}:${GID}" in docker-compose — ponder writes ponder-env.d.ts here)
RUN chmod -R a+rwX /app
RUN chmod a+rx /app/start.sh

# Expose Ponder API port
EXPOSE 42069

# Start via the wrapper script so local Docker can still pick up /workspace/.env
# while production can switch to `ponder start` via PONDER_SCRIPT.
CMD ["/app/start.sh"]
