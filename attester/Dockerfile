# Dockerfile for AI Attester service
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy SDK package (dependency)
COPY sdk/package*.json ./sdk/
COPY sdk/ ./sdk/

# Install dependencies
RUN npm ci

# Build SDK first (dependency)
RUN cd sdk && npm run build

# Copy attester source
COPY attester/package*.json ./attester/
COPY attester/ ./attester/

# Build attester
RUN cd attester && npm run build

# Expose the attester API port
EXPOSE 3000

# Start the attester service
CMD ["node", "attester/dist/index.js"]
