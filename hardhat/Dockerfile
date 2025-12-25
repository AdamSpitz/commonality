# Dockerfile for Hardhat node and deployment
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

# Copy contract code and test scripts
COPY . .

# Compile contracts
RUN pnpm run build

# Expose Hardhat node port
EXPOSE 8545

# Default command: start Hardhat node
# This will be overridden in docker-compose for different services
CMD ["pnpm", "exec", "hardhat", "node", "--hostname", "0.0.0.0"]
