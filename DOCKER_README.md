# Commonality Docker Setup

This Docker setup provides a **fully self-contained** Commonality environment with:
- Local Ethereum blockchain (Hardhat node)
- Deployed smart contracts
- Pre-generated test data (users, statements, beliefs, implications)
- Ponder indexer with GraphQL API

Perfect for exploration, development, and experimentation without needing any external services.

## Prerequisites

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **4GB+ RAM** available for Docker
- **10GB+ disk space** (for Docker images and volumes)

That's it! No Node.js, npm, or other tools required on your host machine.

## Quick Start (30 seconds)

```bash
# Clone the repository
git clone <repository-url>
cd commonality

# (Optional) Customize configuration
cp .env.example .env
# Edit .env if you want to change NUM_USERS or NUM_ROUNDS

# Start everything!
docker-compose up

# Wait for initialization to complete (~2-5 minutes)
# You'll see: "=== Initialization Complete ===" and "Started listening on http://0.0.0.0:42069"
```

That's it! The indexer is now running at [http://localhost:42069](http://localhost:42069)

## What Just Happened?

When you run `docker-compose up`, three services start in sequence:

### 1. Hardhat Node (immediate)
- Starts a local Ethereum blockchain on port 8545
- Provides instant transactions with no gas costs
- Completely isolated from any real blockchain

### 2. Initialization (~2-3 minutes)
- Deploys all smart contracts (Beliefs, Implications, ProjectAlignment)
- Generates 30 simulated users with Ethereum addresses
- Generates ~100+ statements across different domains (politics, crypto, etc.)
- Executes 5 rounds of random user actions:
  - Users sign statements (beliefs/disbeliefs)
  - AI attesters create implication relationships
  - Hundreds of blockchain transactions
- Saves contract addresses to shared volume
- **This service exits when complete**

### 3. Ponder Indexer (starts after init)
- Reads contract addresses from initialization
- Connects to the local Hardhat node
- Syncs all blockchain events from block 0
- Exposes GraphQL API on port 42069
- **This service keeps running**

## Accessing the Data

### GraphQL Playground

Open in your browser: [http://localhost:42069/graphql](http://localhost:42069/graphql)

Try these queries:

```graphql
# Get all statements
{
  statements(limit: 10) {
    items {
      id
      title
      statementType
      believerCount
      disbelieverCount
    }
  }
}

# Get users and their beliefs
{
  users(limit: 5) {
    items {
      id
      beliefCount
      disbeliefCount
    }
  }
}

# Get implication relationships
{
  implications(limit: 20) {
    items {
      fromStatementId
      toStatementId
      attester
    }
  }
}

# Get beliefs for a specific statement
{
  beliefs(where: { statementId: "0x..." }) {
    items {
      user
      beliefState
      blockNumber
    }
  }
}
```

### Custom REST APIs

The indexer also exposes custom REST endpoints:

```bash
# Get support info for a statement
curl http://localhost:42069/conceptspace/api/statement-support/0x<statement-id>

# Get indirect supporters
curl http://localhost:42069/conceptspace/api/indirect-supporters/0x<statement-id>

# Get active delegatable notes
curl http://localhost:42069/delegation/api/active-notes

# Get delegation chain for a note
curl http://localhost:42069/delegation/api/delegation-chain/<note-id>
```

### Direct Database Access

The indexer uses SQLite, stored in a Docker volume. To query it directly:

```bash
# Access the indexer container
docker exec -it commonality-indexer sh

# Inside the container, use sqlite3
cd .ponder
ls  # You'll see SQLite database files

# Install sqlite3 if needed (Alpine Linux)
apk add sqlite

# Query the database
sqlite3 sqlite/public.db
sqlite> .tables
sqlite> SELECT * FROM statements LIMIT 5;
sqlite> SELECT COUNT(*) FROM beliefs;
```

### Extracting Data for External Use

If you want to load data into a graph database or other tools:

```bash
# Export GraphQL schema
curl http://localhost:42069/graphql?sdl > schema.graphql

# Export all statements as JSON
curl -X POST http://localhost:42069/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ statements(limit: 1000) { items { id title statementType believerCount } } }"}' \
  | jq '.data.statements.items' > statements.json

# Copy the SQLite database to your host machine
docker cp commonality-indexer:/app/.ponder/sqlite/public.db ./indexer-data.db
```

## Configuration Options

### Environment Variables

Edit `.env` to customize the simulation:

```bash
# Generate more users (creates more diverse data)
NUM_USERS=100

# Run more simulation rounds (creates more beliefs, implications)
NUM_ROUNDS=10
```

Then restart:
```bash
docker-compose down
docker-compose up
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View logs for a specific service
docker-compose logs hardhat-node
docker-compose logs init
docker-compose logs indexer

# Follow logs in real-time
docker-compose logs -f indexer
```

### Checking Service Status

```bash
# See which services are running
docker-compose ps

# Check indexer health
curl http://localhost:42069/status

# Check if Hardhat node is responding
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Common Tasks

### Regenerate Data (Fresh Start)

To wipe everything and regenerate new data:

```bash
# Stop and remove containers and volumes
docker-compose down -v

# Start fresh
docker-compose up
```

This will:
- Delete all blockchain data
- Delete the indexer database
- Deploy new contracts with new addresses
- Generate new random users and statements
- Create a completely fresh dataset

### Change Simulation Parameters

```bash
# Edit .env
nano .env

# Change NUM_USERS and/or NUM_ROUNDS
NUM_USERS=50
NUM_ROUNDS=8

# Regenerate with new parameters
docker-compose down -v
docker-compose up
```

### Inspect Generated Data Files

The initialization script creates several JSON files with simulation data:

```bash
# Access the init container's data (while it's running)
docker exec -it commonality-init sh
cd /app/generative-tests
cat users.json | head -50
cat statements.json | head -50
cat actions.json | tail -100
cat metrics.json
```

Or copy them to your host machine:
```bash
docker cp commonality-init:/app/generative-tests/users.json ./
docker cp commonality-init:/app/generative-tests/statements.json ./
docker cp commonality-init:/app/generative-tests/actions.json ./
```

### Run Additional Commands in Containers

```bash
# Run a command in the hardhat container
docker exec -it commonality-hardhat-node npx hardhat console --network localhost

# Query blockchain directly
docker exec -it commonality-hardhat-node sh
npx hardhat console --network localhost
> const blockNumber = await ethers.provider.getBlockNumber()
> console.log(blockNumber)
```

## Troubleshooting

### "Error: address already in use"

If ports 8545 or 42069 are already in use:

```bash
# Find what's using the port
lsof -i :8545
lsof -i :42069

# Kill the process or change ports in docker-compose.yml
```

To use different ports, edit `docker-compose.yml`:
```yaml
ports:
  - "9545:8545"  # Map to different host port
```

### "Initialization seems stuck"

Check the init service logs:
```bash
docker-compose logs init
```

The initialization can take 2-5 minutes depending on NUM_USERS and NUM_ROUNDS. Look for progress messages like:
- "Generating users..."
- "Deploying contracts..."
- "Round 1/5..."

### "Indexer isn't syncing"

Check if contract addresses were written correctly:
```bash
# View the addresses file
docker exec commonality-indexer cat /app/deployment-output/addresses.env

# Check indexer logs for errors
docker-compose logs indexer | grep -i error
```

### "No data in GraphQL queries"

This could mean:
1. Indexer hasn't finished syncing yet (check logs)
2. No data was generated (check init logs for errors)
3. Contract addresses don't match (verify addresses in both init and indexer)

Verify sync status:
```bash
curl http://localhost:42069/status
```

### "Out of memory errors"

Reduce the simulation size:
```bash
# In .env
NUM_USERS=10
NUM_ROUNDS=3
```

Or allocate more RAM to Docker in your Docker Desktop settings.

### Starting Over

If things are completely broken:

```bash
# Nuclear option: delete everything
docker-compose down -v
docker system prune -a  # Warning: removes ALL Docker images/containers

# Start fresh
docker-compose up
```

## Architecture Details

### Service Communication

```
┌─────────────────┐
│  Hardhat Node   │ :8545
│  (blockchain)   │
└────────┬────────┘
         │
         │ JSON-RPC
         │
    ┌────┴─────────────────┐
    │                      │
┌───▼──────────┐     ┌────▼────────┐
│     Init     │     │   Indexer   │ :42069
│   (runs once)│     │ (persistent)│
└──────┬───────┘     └─────────────┘
       │                    │
       │                    │
       └─────shared─────────┘
           volume
        (contract addresses)
```

### Data Flow

1. **Hardhat Node** runs continuously, storing blockchain state in memory
2. **Init** service:
   - Deploys contracts to Hardhat node
   - Generates and funds user accounts
   - Creates statements (IPFS CIDs)
   - Submits hundreds of transactions
   - Writes contract addresses to shared volume
   - Exits after completion
3. **Indexer** service:
   - Reads contract addresses from shared volume
   - Queries Hardhat node for historical events
   - Indexes data into SQLite database
   - Exposes GraphQL API
   - Continues running to serve queries

### Persistence

- **Hardhat node**: Data stored in container memory (lost on restart)
- **Indexer database**: Stored in Docker volume `ponder-data` (persists across restarts)
- **Contract addresses**: Stored in Docker volume `contract-data` (shared between services)

To persist blockchain state across restarts, you'd need to modify the Hardhat configuration to use a persistent database. Currently, restarting `hardhat-node` service creates a fresh blockchain.

## Next Steps

### For Exploring the Data

1. **Learn GraphQL**: Use the playground to explore the schema
2. **Extract to Graph DB**: Export data and load into Neo4j, ArangoDB, etc.
3. **Build Visualizations**: Use the API to create dashboards
4. **Test Queries**: Write complex federated queries across subsystems

### For Development

1. **Modify Contracts**: Edit contracts in `hardhat/contracts/`, rebuild: `docker-compose build hardhat-node`
2. **Change Indexer Logic**: Edit `indexer/src/`, rebuild: `docker-compose build indexer`
3. **Add More Data**: Increase NUM_USERS and NUM_ROUNDS in `.env`
4. **Test New Features**: Deploy additional contracts in `docker-init.js`

### For Production

This setup is for **local development only**. For production:
- Use a real L2 network (Base, Optimism, etc.)
- Deploy contracts to testnet/mainnet
- Point indexer to production RPC endpoint
- Use PostgreSQL instead of SQLite
- Add monitoring and logging
- Implement proper API authentication

## Stopping and Cleaning Up

```bash
# Stop services (preserves data volumes)
docker-compose stop

# Stop and remove containers (preserves data volumes)
docker-compose down

# Remove containers AND data volumes (complete cleanup)
docker-compose down -v

# Remove Docker images too (free up disk space)
docker-compose down -v --rmi all
```

## Getting Help

If you encounter issues:

1. **Check logs**: `docker-compose logs [service-name]`
2. **Verify connectivity**: Ensure services can reach each other
3. **Check resources**: Make sure Docker has enough RAM/CPU
4. **Review this README**: Most common issues are covered above
5. **Start fresh**: `docker-compose down -v && docker-compose up`

## Summary

You now have a complete, self-contained Commonality environment running locally:

- ✅ Local blockchain with deployed contracts
- ✅ 30+ simulated users with Ethereum addresses
- ✅ 100+ generated statements across multiple domains
- ✅ Hundreds of blockchain transactions (beliefs, implications)
- ✅ Ponder indexer with GraphQL API
- ✅ All data accessible via API or direct database queries

Experiment, explore, and have fun! 🚀
