# Deployment Guide

This guide covers deploying Commonality's smart contracts and services to local, testnet, and mainnet environments.

## Overview

Commonality consists of several deployable components:

1. **Smart Contracts** - Core protocol contracts deployed to Ethereum (or L2)
2. **Ponder Indexer** - GraphQL indexer for contract events
3. **AI Attester Service** - Evaluates statement implications using LLMs
4. **Frontend UI** - User interface deployed to IPFS via Pinata, accessed via ENS + eth.limo

## Local Deployment (Development)

### Quick Start with Docker Compose

The fastest way to run Commonality locally is to use the dev.sh script:

```bash
./dev.sh --stop      # Stop services without wiping data
./dev.sh --wipe      # Wipe data directory only
./dev.sh --start     # Start services (preserves existing data)
./dev.sh --fresh     # Wipe, then start

# Populate with fake data:
./dev.sh --seed         # Small dataset (10 users, 3 rounds) - default
./dev.sh --seed=small   # Small dataset (10 users, 3 rounds)
./dev.sh --seed=medium  # Medium dataset (50 users, 5 rounds)
./dev.sh --seed=large   # Large dataset (100 users, 10 rounds)

# Use hardhat accounts for the first 20 users (so you can connect with your wallet):
# The 0th user will be 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (the default hardhat account)
./dev.sh --seed --use-hardhat-accounts
./dev.sh --seed=large --use-hardhat-accounts
```

All data (hardhat, ipfs, ponder) is stored in `./data/` by default. To use a custom data directory:
```bash
export COMMONALITY_DATA_DIR=/custom/path ./dev.sh
```

To use the UI locally:
```bash
cd ui && npm run dev
```

### Running Integration Tests

```bash
./scripts/run-integration-tests.sh
```

This uses a separate data directory (`/tmp/commonality-it`) that's wiped after tests complete.

## Testnet Deployment (Sepolia)

### Prerequisites

1. **Get Sepolia ETH** - Obtain testnet ETH from a faucet
2. **Configure secrets** - Copy `.env.secrets.example` to `.env.secrets` and set:
   ```bash
   DEPLOYER_PRIVATE_KEY=0x...  # Your deployer wallet private key (NEVER commit!)
   ```
   Optionally set `SEPOLIA_RPC_URL` in `.env.secrets` if you want a private RPC (default: `https://rpc.sepolia.org`).

### Deploy Contracts

```bash
cd hardhat
npx hardhat run scripts/deploy.js --network sepolia
```

This will:
- Deploy all smart contracts to Sepolia
- Save contract addresses to `deployments/sepolia.env` (commit this!)
- Save detailed deployment metadata to `hardhat/deployments/sepolia-<timestamp>.json`
- Update `.env`, `ui/.env`, `attester/.env`, and `integration-tests/.env.local` with addresses

To regenerate all service `.env` files later (e.g. on a fresh clone):

```bash
./scripts/setup-env.sh sepolia
```

### Verify Contracts (Optional but Recommended)

```bash
# Verify on Etherscan (requires ETHERSCAN_API_KEY in .env)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Deploy Attester to Render

See [attester/README.md](attester/README.md) for comprehensive Render deployment instructions.

**Summary:**

1. Push code to GitHub (including `deployments/sepolia.env` with contract addresses)
2. Create new Web Service on Render
3. Connect to GitHub repository
4. Configure environment variables (secrets only — contract addresses come from the deployment file):
   ```
   ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   ATTESTER_PRIVATE_KEY=0x...
   IMPLICATIONS_CONTRACT_ADDRESS=0x...  # Copy from deployments/sepolia.env
   OPENROUTER_API_KEY=sk-...
   X402_PAYMENT_ADDRESS=0x...
   ```
5. Deploy and test `/health` endpoint

## Mainnet Deployment

⚠️ **CRITICAL SECURITY WARNINGS** ⚠️

Before deploying to mainnet:

1. **Professional Smart Contract Audit** - Get contracts audited by reputable firm
2. **Thorough Testing** - Run extensive integration and invariant tests
3. **Gradual Rollout** - Consider deploying to testnet first, then mainnet with limits
4. **Emergency Procedures** - Have pause mechanisms and incident response plan ready

### Prerequisites

1. **Mainnet ETH** - Sufficient ETH for deployment gas (estimate: 0.05-0.1 ETH)
2. **Configure secrets** in `.env.secrets`:
   ```bash
   DEPLOYER_PRIVATE_KEY=0x...  # Use hardware wallet or secure key management
   MAINNET_RPC_URL=https://eth.llamarpc.com  # Or use Alchemy/Infura
   ```
3. **Verify Configuration** - Double-check all contract parameters

### Deploy Contracts

```bash
cd hardhat
npx hardhat run scripts/deploy.js --network mainnet
```

After deployment, commit `deployments/mainnet.env` and run `./scripts/setup-env.sh mainnet` to propagate addresses.

### Post-Deployment Checklist

- [ ] Verify all contracts on Etherscan
- [ ] Test basic functionality (create belief, add implication, etc.)
- [ ] Update documentation with mainnet contract addresses
- [ ] Configure indexer for mainnet
- [ ] Deploy attester service to production (Render)
- [ ] Set up monitoring and alerting
- [ ] Deploy frontend to IPFS and update ENS (`./scripts/deploy-ui.sh mainnet` + `./scripts/update-ens.sh`)
- [ ] Announce deployment to community

## UI Deployment (IPFS + ENS)

The UI is deployed as a static site to IPFS via [Pinata](https://www.pinata.cloud/), with an ENS name pointing to the IPFS content hash. Users access the UI at `https://<name>.eth.limo`.

Per [specs/legal.md](specs/legal.md), the UI must be deployed to IPFS (not centralized hosting) to maintain the project's decentralized nature and reduce legal exposure.

### Overview

1. Build the UI with the correct contract addresses baked in
2. Upload the build to IPFS via Pinata (returns a CID)
3. Update the ENS name's contenthash to point to the new CID
4. The UI is accessible at `https://<name>.eth.limo`

Since contract addresses are baked into the Vite build at compile time (`VITE_*` env vars), each network (sepolia, mainnet) needs its own build and its own CID.

### Prerequisites

1. **Pinata account** — Sign up at https://app.pinata.cloud and create an API key (needs `pinFileToIPFS` permission). Add the JWT to `.env.secrets`:
   ```
   PINATA_JWT=your_jwt_token
   ```

2. **ENS name** — Register an ENS name (e.g. on https://app.ens.domains). Add the owner wallet's private key to `.env.secrets`:
   ```
   ENS_OWNER_PRIVATE_KEY=0x...
   ```

3. **Contracts deployed** — The target network must have contracts deployed (i.e. `deployments/<network>.env` must exist).

### Deploy UI to IPFS

```bash
./scripts/deploy-ui.sh <network>
```

This script:
1. Runs `setup-env.sh <network>` to populate `ui/.env` with contract addresses
2. Builds the UI (`npm run build` in `ui/`)
3. Uploads `ui/dist/` to Pinata
4. Prints the IPFS CID

Example:
```bash
./scripts/deploy-ui.sh sepolia
# Setting up environment for sepolia...
# Building UI...
# Uploading ui/dist/ to Pinata...
#
# Upload complete!
#   CID:     QmXyz...
#   Gateway: https://gateway.pinata.cloud/ipfs/QmXyz...
#
# To update ENS contenthash:
#   ./scripts/update-ens.sh <ens-name> QmXyz...
```

Verify the upload by visiting the gateway URL in a browser.

### Update ENS Contenthash

```bash
./scripts/update-ens.sh <ens-name> <cid> [--network sepolia|mainnet]
```

Default network is `mainnet`. Use `--network sepolia` for testnet ENS names.

This script:
1. Encodes the IPFS CID as an ENS contenthash ([EIP-1577](https://eips.ethereum.org/EIPS/eip-1577))
2. Looks up the ENS name's resolver
3. Calls `setContenthash` on the resolver
4. Waits for transaction confirmation

Example:
```bash
./scripts/update-ens.sh commonality.eth QmXyz...
./scripts/update-ens.sh commonality.eth QmXyz... --network sepolia
```

After the transaction confirms, the UI is accessible at:
- `https://commonality.eth.limo` (via [eth.limo](https://eth.limo/) gateway)
- `ipfs://QmXyz...` (in IPFS-compatible browsers)

### Typical Workflow

```bash
# 1. Deploy contracts to sepolia
cd hardhat && npx hardhat run scripts/deploy.js --network sepolia

# 2. Build + upload UI for sepolia
./scripts/deploy-ui.sh sepolia
# → CID: QmAbc...

# 3. Test via gateway
#    Visit https://gateway.pinata.cloud/ipfs/QmAbc...

# 4. (Optionally) Point a testnet ENS name at it
./scripts/update-ens.sh myapp.eth QmAbc... --network sepolia

# 5. Deploy contracts to mainnet
cd hardhat && npx hardhat run scripts/deploy.js --network mainnet

# 6. Build + upload UI for mainnet (different CID due to different addresses)
./scripts/deploy-ui.sh mainnet
# → CID: QmXyz...

# 7. Point production ENS name at it
./scripts/update-ens.sh myapp.eth QmXyz...
# → https://myapp.eth.limo
```

### UI Deployment Checklist

- [ ] Smart contracts deployed to target network
- [ ] `PINATA_JWT` set in `.env.secrets`
- [ ] `ENS_OWNER_PRIVATE_KEY` set in `.env.secrets`
- [ ] `VITE_WALLETCONNECT_PROJECT_ID` set in `.env.secrets`
- [ ] Indexer GraphQL endpoint URL configured (`VITE_GRAPHQL_URL`)
- [ ] Run `./scripts/deploy-ui.sh <network>` — note the CID
- [ ] Verify the build at `https://gateway.pinata.cloud/ipfs/<CID>`
- [ ] Run `./scripts/update-ens.sh <name>.eth <CID> [--network ...]`
- [ ] Verify the UI loads at `https://<name>.eth.limo`
- [ ] Test wallet connection and key workflows on the deployed UI

### Important Notes

1. **Immutability:** Each IPFS deployment gets a unique CID. To update the UI, deploy a new version and update the ENS contenthash.

2. **Pinning:** Content uploaded via Pinata is pinned automatically. As long as your Pinata account is active, the content remains available.

3. **Environment Variables:** Vite only includes `VITE_*` prefixed variables in the build. Contract addresses and the GraphQL URL are baked in at build time by `setup-env.sh`.

4. **Network-specific builds:** Because contract addresses differ between sepolia and mainnet, each network needs its own build and CID. If you have separate ENS names for testnet and mainnet, each gets its own contenthash.

## Network Configuration

### Hardhat Networks

Configured in `hardhat/hardhat.config.cjs`:

| Network | RPC URL | Chain ID | Usage |
|---------|---------|----------|-------|
| localhost | http://127.0.0.1:8545 | 31337 | Local dev |
| sepolia | https://rpc.sepolia.org | 11155111 | Testnet |
| mainnet | https://eth.llamarpc.com | 1 | Production |

All networks use 120-second timeout.

### Alternative: Base L2 Deployment

The project documentation mentions considering Base/Base Sepolia (see [specs/tech.md](specs/tech.md)). To deploy to Base:

1. Update `hardhat.config.cjs` with Base network:
   ```javascript
   base: {
     url: "https://mainnet.base.org",
     chainId: 8453,
     accounts: [process.env.DEPLOYER_PRIVATE_KEY]
   }
   ```
2. Deploy: `npx hardhat run scripts/deploy.js --network base`

## Environment Variables

Environment configuration is split into two categories:

### Secrets (manual — `.env.secrets`)

You set these once. They never get committed. Copy `.env.secrets.example` to `.env.secrets`:

```bash
DEPLOYER_PRIVATE_KEY=0x...        # Wallet for deploying contracts
ATTESTER_PRIVATE_KEY=0x...        # Wallet for the attester service
OPENROUTER_API_KEY=sk-...         # LLM API key for attester
VITE_WALLETCONNECT_PROJECT_ID=... # From cloud.walletconnect.com
# ETHERSCAN_API_KEY=...           # Optional, for contract verification
# X402_PAYMENT_ADDRESS=0x...      # Optional, payment recipient
```

### Contract Addresses (auto-populated — `deployments/<network>.env`)

The deploy script writes these. They are committed to git so all services can reference them:

```
deployments/
  ├── localhost.env   # Local Hardhat node addresses
  ├── sepolia.env     # Testnet addresses (after deploying)
  └── mainnet.env     # Production addresses (after deploying)
```

Each file contains all contract addresses (BELIEFS_CONTRACT_ADDRESS, IMPLICATIONS_CONTRACT_ADDRESS, etc.).

### How it fits together

```
.env.secrets              ← you fill in (gitignored)
deployments/<network>.env ← deploy script fills in (committed)
         ↓
  ./scripts/setup-env.sh <network>
         ↓
  .env                    ← root (hardhat, docker-compose, indexer)
  attester/.env           ← attester service
  ui/.env                 ← frontend (VITE_ prefixed)
  integration-tests/.env.local
```

The deploy script also propagates addresses to service `.env` files automatically. Use `setup-env.sh` to regenerate them later (e.g. on a fresh clone, or to switch networks).

### Attester Service Variables

See [attester/README.md](attester/README.md) for full list. Key variables:

```bash
ETHEREUM_RPC_URL=...                # RPC endpoint for network
ATTESTER_PRIVATE_KEY=0x...          # Attester wallet (needs ETH) — from .env.secrets
IMPLICATIONS_CONTRACT_ADDRESS=0x... # From deployments/<network>.env
OPENROUTER_API_KEY=sk-...           # LLM API key — from .env.secrets
X402_PAYMENT_ADDRESS=0x...          # Payment recipient — from .env.secrets
```

## Deployment Artifacts

### Contract Deployment Records

After deployment, find deployment info in two places:

**Committable addresses** (use these):
```
deployments/
  ├── localhost.env
  ├── sepolia.env
  └── mainnet.env
```

**Detailed JSON metadata** (gitignored, for reference):
```
hardhat/deployments/
  ├── localhost-<timestamp>.json
  ├── sepolia-<timestamp>.json
  └── mainnet-<timestamp>.json
```

Each JSON file contains: contract addresses, deployer address, block number, transaction hash, timestamp.

### Indexer Configuration

Update `indexer/ponder.config.ts` with the deployed network:

```typescript
networks: {
  mainnet: {
    chainId: 1,
    transport: http(process.env.PONDER_RPC_URL_1),
  },
},
```

## Monitoring and Verification

### Verify Deployment Success

1. **Check contract addresses** - All contracts deployed to expected addresses
2. **Test basic operations** - Create belief, add implication, verify indexer updates
3. **Monitor gas usage** - Ensure operations are within expected gas limits
4. **Check indexer sync** - Ponder indexer catching up with chain

### Health Checks

- **Attester service**: `curl https://your-service.onrender.com/health`
- **Indexer GraphQL**: `curl http://localhost:42069` (or production URL)
- **IPFS**: `curl http://localhost:5001/api/v0/id` (or Pinata/Infura)

## Troubleshooting

### Common Issues

**"Insufficient funds for gas"**
- Ensure deployer wallet has enough ETH for gas
- Check network gas prices and adjust

**"Contract deployment timeout"**
- Increase timeout in `hardhat.config.cjs`
- Use faster RPC endpoint

**"Indexer not syncing"**
- Verify contract addresses in `ponder.config.ts`
- Check RPC URL connectivity
- Review indexer logs for errors

**"Attester service failing to attest"**
- Verify attester wallet has ETH
- Check `IMPLICATIONS_CONTRACT_ADDRESS` is correct
- Verify LLM API key is valid

### Getting Help

- Review contract ABIs in `hardhat/artifacts/contracts/`
- Check integration tests in `integration-tests/` for usage examples
- See [specs/](specs/) directory for technical architecture
- Review [TODO.md](TODO.md) for known issues

## Security Best Practices

1. **Never commit private keys** - Use `.env.secrets` (gitignored) or hardware wallets
2. **Use separate wallets** - Different keys for deployer, attester, and admin roles
3. **Test on testnet first** - Always deploy to Sepolia before mainnet
4. **Verify contract source** - Publish verified source on Etherscan
5. **Monitor contract activity** - Set up alerts for unusual transactions
6. **Limit initial exposure** - Consider caps/pauses for initial mainnet deployment
7. **Incident response plan** - Have procedures for emergency pause or upgrade

## Next Steps After Deployment

1. **Generative Testing** - Run attack scenarios and invariant checking (see [TODO.md](TODO.md))
2. **Professional Audit** - Engage smart contract auditors
3. **Documentation Update** - Update all docs with mainnet addresses
4. **Community Announcement** - Notify users of deployment
5. **Monitoring Setup** - Configure Tenderly, Defender, or similar tools
6. **Frontend Deployment** - Deploy UI pointing to production contracts
