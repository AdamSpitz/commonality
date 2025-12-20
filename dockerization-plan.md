# Dockerization Plan for Integration Tests

## Current Architecture Analysis

Your current setup uses [run-integration-tests.sh](scripts/run-integration-tests.sh) which orchestrates three services:

1. **Hardhat Node** (port 8545) - Local blockchain
2. **Ponder Indexer** (port 42069) - Indexes blockchain events and provides GraphQL API
3. **Integration Tests** - Mocha tests that verify everything works together

The script manages process PIDs, log files, and cleanup - it's functional but fragile (as you noted, "hacky").

## What a Proper Docker Setup Would Look Like

Here's what you'd need to implement:

### **1. Docker Compose Architecture**

You'd create a `docker-compose.yml` at the root with these services:

**Service 1: `hardhat-node`**
- Use the existing [hardhat/Dockerfile](hardhat/Dockerfile)
- Runs `hardhat node --hostname 0.0.0.0`
- Exposes port 8545
- Healthcheck: curl to JSON-RPC endpoint
- Named volume for blockchain data (optional, for persistence between runs)

**Service 2: `hardhat-deploy`**
- Uses same Dockerfile as hardhat-node
- Runs `npm run deploy-local` as a one-shot command
- `depends_on: hardhat-node` with healthcheck condition
- Shares network with hardhat-node
- Exits after deployment completes

**Service 3: `indexer`**
- Use the existing [indexer/Dockerfile](indexer/Dockerfile)
- Runs `npm run dev:no-ui` (or `start` for production)
- Exposes port 42069
- `depends_on: hardhat-deploy` (wait for contracts to be deployed)
- Environment variables from `.env` file
- Volume mount for `.ponder` directory cleanup strategy
- Healthcheck: curl to GraphQL endpoint

**Service 4: `integration-tests`** (optional, can also run from host)
- New Dockerfile in `integration-tests/`
- Runs `npm test`
- `depends_on: indexer` with healthcheck condition
- Shares network with other services
- Exits after tests complete

### **2. Key Technical Challenges to Solve**

**a) Sequential Startup Dependencies**
The services must start in order:
```
hardhat-node → deploy → indexer → tests
```

You'd handle this with:
- Docker healthchecks for each service
- `depends_on` with `condition: service_healthy`
- Wait scripts if healthchecks aren't sufficient

**b) Environment Variable Management**
Currently, [deploy-local.js](hardhat/scripts/deploy-local.js) writes contract addresses to `.env`. In Docker:
- Option 1: Use a shared volume for the `.env` file
- Option 2: Deploy service writes to a shared volume, other services read from it
- Option 3: Use Docker secrets/configs for addresses

**c) Database Cleanup**
[start-indexer.sh:39-42](scripts/start-indexer.sh#L39-L42) deletes `.ponder` directory for fresh state. In Docker:
- Option 1: No volume (ephemeral, recreated each run)
- Option 2: Init script that clears volume on startup
- Option 3: Use `PONDER_EPHEMERAL=true` for in-memory DB

**d) Network Communication**
Services need to reference each other:
- `hardhat-node` at `http://hardhat-node:8545` (not localhost)
- `indexer` at `http://indexer:42069`
- Update [ponder.config.ts:70](indexer/ponder.config.ts#L70) to use Docker service names

### **3. File Structure**

```
commonality/
├── docker-compose.yml              # Main orchestration
├── docker-compose.dev.yml          # Development overrides
├── .env                            # Environment template
├── .dockerignore                   # Exclude node_modules, etc.
├── hardhat/
│   ├── Dockerfile                  # Already exists
│   └── docker-entrypoint.sh        # Optional: handle deployment
├── indexer/
│   ├── Dockerfile                  # Already exists
│   └── docker-entrypoint.sh        # Optional: cleanup .ponder
└── integration-tests/
    ├── Dockerfile                  # New: test runner
    └── .dockerignore               # Exclude logs
```

### **4. Benefits for You and Sam**

**For integration tests:**
```bash
# One command to rule them all
docker-compose up --abort-on-container-exit

# Run specific tests
docker-compose run integration-tests npm test -- "delegation*.test.ts"

# Clean slate
docker-compose down -v && docker-compose up
```

**For Sam's use case (data generation + analysis):**
```bash
# Start just the infrastructure
docker-compose up -d hardhat-node indexer

# Generate data (from host or another container)
docker-compose exec hardhat-node npm run gen:large

# Sam's analysis tools can connect to:
# - Blockchain: localhost:8545
# - GraphQL: localhost:42069
```

### **5. Incremental Migration Path**

You don't have to do this all at once:

**Phase 1: Docker Compose for services only**
- Keep using the shell script for orchestration
- Just containerize hardhat + indexer for portability
- Tests still run from host

**Phase 2: Add deployment service**
- Make deployment a proper service
- Handle .env file generation cleanly

**Phase 3: Containerize tests**
- Move tests into container
- Full isolation

**Phase 4: Replace shell script**
- Remove [run-integration-tests.sh](scripts/run-integration-tests.sh)
- Pure Docker Compose workflow

### **6. Specific Implementation Considerations**

**The `.env` file challenge:**
Looking at [ponder.config.ts](indexer/ponder.config.ts), it needs all the contract addresses. Currently [deploy-local.js](hardhat/scripts/deploy-local.js) writes these to `.env`. In Docker:

```yaml
# docker-compose.yml
services:
  hardhat-deploy:
    volumes:
      - ./shared-env:/app/shared-env
    command: >
      sh -c "npm run deploy-local && cp .env /app/shared-env/.env"

  indexer:
    volumes:
      - ./shared-env:/app/shared-env
    env_file:
      - ./shared-env/.env
```

**The "wait for indexer to sync" problem:**
Your [start-indexer.sh:81-103](scripts/start-indexer.sh#L81-L103) waits for GraphQL to be ready. In Docker:

```dockerfile
# indexer/Dockerfile
HEALTHCHECK --interval=2s --timeout=10s --retries=30 \
  CMD curl -f -X POST -H "Content-Type: application/json" \
  --data '{"query":"{ _meta { block { number } } }"}' \
  http://localhost:42069/graphql || exit 1
```

## Next Steps

Choose an approach:
1. **Create a complete docker-compose.yml** with all services configured?
2. **Start with Phase 1** (just containerize the services, keep the shell script)?
3. **Focus on a specific challenge** (like the .env file handling)?
