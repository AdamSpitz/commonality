# Dockerfile for Ponder indexer
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Ponder API port
EXPOSE 42069

# Start Ponder in dev mode (no UI for integration tests)
# Use dev:no-ui which doesn't require DATABASE_SCHEMA
CMD ["npm", "run", "dev:no-ui"]
