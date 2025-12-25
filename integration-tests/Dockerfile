FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm

# Set up workspace structure
WORKDIR /workspace

# Copy workspace config and root package files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy all workspace package.json files (needed for workspace resolution)
COPY sdk/package.json ./sdk/package.json
COPY integration-tests/package.json ./integration-tests/package.json

# Install all workspace dependencies (includes platform-specific binaries for Linux)
RUN pnpm install --frozen-lockfile

# Copy SDK source (needed by integration tests, mounted volumes don't include node_modules)
COPY sdk ./sdk

# Note: Integration test source is mounted via volumes at runtime for live updates
# SDK source is copied in because it's imported by tests and needs the Linux node_modules

# Set working directory to integration-tests
WORKDIR /workspace/integration-tests

# Default command (can be overridden)
CMD ["pnpm", "test"]
