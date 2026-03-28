# Dockerfile for Ponder indexer
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Allow any user to write to /app (needed when running as non-root via
# user: "${UID}:${GID}" in docker-compose — ponder writes ponder-env.d.ts here)
RUN chmod -R a+rwX /app

# Expose Ponder API port
EXPOSE 42069

# Start Ponder in dev mode (no UI for integration tests)
# Use dev:no-ui which doesn't require DATABASE_SCHEMA
CMD ["npm", "run", "dev:no-ui"]
