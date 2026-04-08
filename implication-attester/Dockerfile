# Dockerfile for AI Attester service
FROM node:24-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy repository
COPY . .

# Install dependencies
RUN npm ci

# Build SDK first (dependency)
RUN cd sdk && npm run build

# Build implication-attester
RUN cd implication-attester && npm run build

# Expose the attester API port
EXPOSE 3000

# Start the attester service
CMD ["node", "implication-attester/dist/index.js"]
