# Dockerfile for Ponder indexer
FROM node:20-alpine

# Install curl for healthcheck and pnpm
RUN apk add --no-cache curl && \
    corepack enable && \
    corepack prepare pnpm@10.26.2 --activate

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (no lockfile in workspace packages)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Expose Ponder API port
EXPOSE 42069

# Start Ponder in dev mode (no UI for integration tests)
# Use dev:no-ui which doesn't require DATABASE_SCHEMA
CMD ["pnpm", "run", "dev:no-ui"]
