# Docker Usage Guide

This guide covers running the Commonality integration test infrastructure with Docker.

## Quick Start

### Option 1: Docker Compose (Recommended)

Start Hardhat node and deploy contracts:

```bash
# Start hardhat node and deploy contracts
docker-compose up hardhat-deploy

# The deploy service will exit after deployment
# The node will keep running in the background
```

This will:
1. Start a Hardhat node on `localhost:8545`
2. Deploy all contracts
3. Write contract addresses to `.env` and `integration-tests/.env.local`

Now you can run the indexer and tests from your host machine as usual:

```bash
# In one terminal: start indexer (on host)
./scripts/start-indexer.sh

# In another terminal: run tests (on host)
cd integration-tests && npm test
```

### Stopping Services

```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (clean slate)
docker-compose down -v
```

### Running Individual Services

```bash
# Just start the hardhat node (without deploying)
docker-compose up -d hardhat-node

# Deploy to the running node
docker-compose run --rm hardhat-deploy

# Check logs
docker-compose logs -f hardhat-node
```

## Integration with Existing Scripts

The Docker setup is designed to work alongside your existing scripts:

**Using Docker for Hardhat:**
```bash
# Start hardhat in Docker
docker-compose up -d hardhat-node
docker-compose run --rm hardhat-deploy

# Run indexer on host
./scripts/start-indexer.sh

# Run tests on host
cd integration-tests && npm test
```

**Using the original shell script (no Docker):**
```bash
# Everything runs on host as before
./scripts/run-integration-tests.sh
```

## Troubleshooting

### Port 8545 already in use

If you get a port conflict:

```bash
# Stop any existing hardhat nodes
./scripts/stop-hardhat-node.sh

# Or find what's using the port
lsof -i :8545
```

### Rebuild after changes

If you modify contracts or hardhat config:

```bash
# Rebuild the hardhat image
docker-compose build hardhat-node

# Or force rebuild
docker-compose build --no-cache hardhat-node
```

### View logs

```bash
# Follow logs for all services
docker-compose logs -f

# Just hardhat node
docker-compose logs -f hardhat-node

# Just deployment
docker-compose logs hardhat-deploy
```

## Next Steps

This is Phase 1 of the dockerization plan. Future phases will:
- Phase 2: Add the indexer to Docker Compose
- Phase 3: Add integration tests to Docker Compose
- Phase 4: Replace shell scripts entirely with Docker Compose

See [dockerization-plan.md](dockerization-plan.md) for the full plan.
