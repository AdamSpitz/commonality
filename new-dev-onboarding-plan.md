# New-Developer Onboarding Plan

## Problem

A new developer clones the repo and can't get the project running because:

1. **`docker-compose up` fails on fresh clone**: The indexer service has `env_file: - .env`, but `.env` is gitignored and doesn't exist on a fresh clone. The deploy script (which creates `.env`) runs *inside* docker-compose, so there's a chicken-and-egg problem — docker-compose can't start because `.env` is missing, but `.env` only gets created when docker-compose runs the deploy container.

2. **`deployments/localhost.env` is also gitignored**: Same story — the deploy script creates it, but it doesn't exist on a fresh clone.

3. **No quickstart in README**: README.md points to DEPLOYMENT.md (a 470-line doc covering local/testnet/mainnet). A new dev has to hunt through it to find the `./dev.sh --seed` command.

4. **Prerequisites not stated**: Node 24.x is required (in package.json `engines` field) and Docker is required, but neither is stated in the README.

5. **No clarity that local dev needs zero secrets**: The `.env.secrets.example` file lists many keys (deployer key, OpenRouter API key, WalletConnect ID, etc.), making it seem like you need all of them to run locally. In reality, local Docker dev works fine without any secrets.

---

## Tasks

### Task 1: Fix dev.sh to handle fresh clones

**File**: `dev.sh`

In every code path that calls `docker-compose up` (the `start_services` and `seed_data` functions), add this **before** the `docker-compose up -d` call:

```bash
# Ensure .env exists (docker-compose needs it for the indexer's env_file).
# The deploy container will populate it with contract addresses.
touch "$SCRIPT_DIR/.env"
```

Also add prerequisite checks near the top of the script (after the `set -e` / variable declarations, before the `case` statement logic runs). Add a helper function:

```bash
check_prerequisites() {
    local missing=0

    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed. Install it from https://docs.docker.com/get-docker/"
        missing=1
    elif ! docker info &> /dev/null 2>&1; then
        echo "Error: Docker daemon is not running. Start Docker and try again."
        missing=1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        echo "Error: Docker Compose is not installed. Install it from https://docs.docker.com/compose/install/"
        missing=1
    fi

    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        echo "Error: node_modules not found. Run 'npm install' first."
        missing=1
    fi

    if [ $missing -ne 0 ]; then
        exit 1
    fi
}
```

Call `check_prerequisites` at the start of `start_services` and `seed_data`.

- [ ] Done

### Task 2: Make docker-compose.yml resilient to missing .env

**File**: `docker-compose.yml`

Change the indexer's `env_file` from:
```yaml
env_file:
  - .env
```
to:
```yaml
env_file:
  - path: .env
    required: false
```

This is a Docker Compose v2 feature. It means docker-compose won't fail if `.env` doesn't exist yet. The deploy container creates `.env` before the indexer starts (the indexer depends on `hardhat-deploy: condition: service_completed_successfully`), so by the time the indexer actually reads its environment, `.env` will be populated.

This is a belt-and-suspenders fix alongside the `touch .env` in dev.sh.

- [ ] Done

### Task 3: Add a "Getting Started" section to README.md

**File**: `README.md`

Add a new section right after the `# Commonality` heading (before "Where to find various files"). Content:

```markdown
## Getting started

**Prerequisites:** [Node.js 24.x](https://nodejs.org/), [Docker](https://docs.docker.com/get-docker/)

```bash
npm install
./dev.sh --seed
cd ui && npm run dev
```

That's it. This starts a local Hardhat blockchain, deploys the smart contracts, starts IPFS and the Ponder indexer, and populates the chain with fake data (10 users, 3 rounds). The UI will be at http://localhost:5173.

No API keys or secrets are needed for local development. See [DEPLOYMENT.md](DEPLOYMENT.md) for testnet/mainnet deployment (which does require secrets).
```

- [ ] Done

### Task 4: Clarify in DEPLOYMENT.md that local dev needs no secrets

**File**: `DEPLOYMENT.md`

In the "Local Deployment (Development)" section (line ~14), add a note after the "Quick Start with Docker Compose" heading. Insert this right before the code block showing `./dev.sh` commands:

```markdown
**No secrets needed for local dev.** The Docker Compose setup runs everything locally (Hardhat blockchain, IPFS node, Ponder indexer) without any API keys or private keys. Just run `npm install` and then `./dev.sh --seed`. Secrets (in `.env.secrets`) are only needed for testnet/mainnet deployment and for running the AI attester service.
```

- [ ] Done

---

## Verification

After completing all tasks, verify from a clean state:

1. Delete generated files to simulate a fresh clone:
   ```bash
   rm -f .env ui/.env attester/.env integration-tests/.env.local deployments/localhost.env
   rm -rf ./data
   ```

2. Run the onboarding flow:
   ```bash
   npm install        # should succeed (package.json is committed)
   ./dev.sh --seed    # should start docker, deploy contracts, seed data — no errors
   ```

3. Confirm services are running:
   - `curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'` — should return a block number
   - `curl -s http://localhost:42069/graphql -X POST -H "Content-Type: application/json" --data '{"query":"{ _meta { block { number } } }"}'` — should return indexer metadata

4. Confirm `cd ui && npm run dev` starts the UI at http://localhost:5173

5. Stop and clean up: `./dev.sh --stop`
