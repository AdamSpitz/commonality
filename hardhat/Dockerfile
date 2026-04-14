# Dockerfile for Hardhat node and deployment
FROM node:24-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy contract code and test scripts
COPY . .

# Compile contracts
RUN npm run build
RUN chmod -R a+rwX /app

# Expose Hardhat node port
EXPOSE 8545

# Default command: start Hardhat node
# This will be overridden in docker-compose for different services
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
