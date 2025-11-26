# Dockerfile for Ponder indexer
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Ponder API port
EXPOSE 42069

# Start Ponder in production mode
CMD ["npm", "run", "start"]
