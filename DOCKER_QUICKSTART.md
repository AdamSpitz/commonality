# Commonality Docker - Quick Start

## For Sam: Get Up and Running in 2 Minutes

### Prerequisites
- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- 4GB+ RAM available for Docker
- 10GB+ disk space

### Steps

```bash
# 1. Clone the repository (or get these files from Adam)
git clone <repository-url>
cd commonality

# 2. Start everything
docker-compose up

# That's it! Wait ~2-3 minutes for initialization to complete
```

### What You'll See

```
commonality-init | === Deploying contracts ===
commonality-init | Beliefs: 0x5FbDB...
commonality-init | Implications: 0xe7f17...
commonality-init | === Generating users ===
commonality-init | Generated 10 users
commonality-init | === Running simulation ===
commonality-init | Round 1/3...
commonality-init | Round 2/3...
commonality-init | Round 3/3...
commonality-init | === Initialization Complete ===
```

### Accessing the Data

#### Option 1: Extract Generated Files

```bash
# Open a new terminal (while docker-compose is running)

# Copy the generated data files
docker cp commonality-init:/app/fake-data-generation/users.json ./
docker cp commonality-init:/app/fake-data-generation/statements.json ./
docker cp commonality-init:/app/fake-data-generation/actions.json ./
docker cp commonality-init:/app/deployment-output/addresses.json ./

# View them
cat users.json | jq '.[0]'
cat statements.json | jq '.[0]'
cat actions.json | jq '.[-10:]'
```

#### Option 2: Query the Blockchain

```bash
# Check current block number
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get account balances
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x00aa5419a5152f68d0ebbcdfd09ca8449c209e11","latest"],"id":1}'
```

#### Option 3: Use Hardhat Console

```bash
# Interactive Ethereum console
docker exec -it commonality-hardhat-node npx hardhat console --network localhost

# Then inside the console:
> const blockNumber = await ethers.provider.getBlockNumber()
> console.log(blockNumber)
> const balance = await ethers.provider.getBalance("0x00aa5419a5152f68d0ebbcdfd09ca8449c209e11")
> console.log(ethers.formatEther(balance))
```

### Customizing the Data

```bash
# Stop everything
docker-compose down -v  # -v removes volumes for a fresh start

# Edit the environment file
cp .env.example .env
nano .env

# Change these values:
NUM_USERS=50      # Generate more users
NUM_ROUNDS=10     # Run more simulation rounds

# Start again with new settings
docker-compose up
```

### What's Inside

After the simulation completes, you'll have:

- **Blockchain**: 139+ blocks with real transaction history
- **Users**: 10 simulated users with ETH balances
- **Statements**: 90+ statements across domains (politics, crypto, music, etc.)
- **Beliefs**: 100+ user beliefs (support/oppose statements)
- **Implications**: AI-generated relationships between statements
- **Contracts**: Deployed Beliefs, Implications, and ProjectAlignment contracts

### Troubleshooting

**"Port already in use"**
```bash
# Check what's using port 8545 or 42069
lsof -i :8545
lsof -i :42069

# Kill the process or change ports in docker-compose.yml
```

**"Out of memory"**
```bash
# Reduce the simulation size in .env
NUM_USERS=10
NUM_ROUNDS=3
```

**"Want to start fresh"**
```bash
# Delete everything and start over
docker-compose down -v
docker-compose up
```

### Next Steps

1. **Read the full docs**: [DOCKER_README.md](DOCKER_README.md)
2. **Extract data** for your graph database
3. **Experiment** with queries and analysis
4. **Customize** the simulation parameters

### Need Help?

- Full documentation: [DOCKER_README.md](DOCKER_README.md)
- Technical details: [DOCKER_SETUP_SUMMARY.md](DOCKER_SETUP_SUMMARY.md)
- Ask Adam!

---

**Enjoy exploring the Commonality data!** 🚀
