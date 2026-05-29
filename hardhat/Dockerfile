# syntax=docker/dockerfile:1.7

# Dockerfile for Hardhat node and deployment
FROM node:24-alpine

# Install curl for healthcheck and native addon build prerequisites for npm install
RUN apk add --no-cache curl python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm install

# Copy contract code and test scripts
COPY . .

# Compile contracts
RUN npm run build
RUN mkdir -p /app/artifacts /app/cache /app/typechain-types /app/deployments \
  && chmod -R a+rwX /app/artifacts /app/cache /app/typechain-types /app/deployments

# Expose Hardhat node port
EXPOSE 8545

# Default command: start Hardhat node
# This will be overridden in docker-compose for different services
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
