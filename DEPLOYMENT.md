# Deployment Guide

This guide covers deploying Commonality's smart contracts and services to local, testnet, and mainnet environments.

## Overview

Commonality consists of several deployable components:

1. **Smart Contracts** - Core protocol contracts deployed to Ethereum (or L2)
2. **Ponder Indexer** - GraphQL indexer for contract events
3. **AI Attester Service** - Evaluates statement implications using LLMs
4. **Frontend UI** - User interface (deployment TBD)

## Local Deployment (Development)

### Quick Start with Docker Compose

The fastest way to run Commonality locally:

```bash
docker-compose up
```

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
- [ ] Update frontend to use mainnet contracts
- [ ] Announce deployment to community

## UI Deployment (IPFS)

**Status:** Not yet implemented ⚠️

### Why IPFS?

Per [specs/legal.md](specs/legal.md), the UI must be deployed to IPFS (not centralized hosting) to maintain the project's decentralized nature and reduce legal exposure.

### How to Deploy UI to IPFS

The UI is a static Vite + React application that can be built and deployed to IPFS:

#### 1. Build the UI

```bash
cd ui
npm run build
```

This creates a production build in `ui/dist/` with optimized static files.

#### 2. Deploy to IPFS

**Option A: Using Pinata (Recommended for production)**

Pinata provides reliable IPFS pinning with CDN delivery:

```bash
# Install Pinata CLI
npm install -g pinata-upload-cli

# Upload dist folder to Pinata
pinata-upload -k YOUR_API_KEY -s YOUR_SECRET ui/dist

# Returns: ipfs://Qm... or https://gateway.pinata.cloud/ipfs/Qm...
```

**Option B: Using Fleek (Automated CI/CD)**

Fleek provides automated IPFS deployment with DNS and CDN:

1. Connect GitHub repository to Fleek
2. Configure build settings:
   - Build command: `cd ui && npm run build`
   - Publish directory: `ui/dist`
3. Fleek auto-deploys on git push
4. Get IPFS CID and gateway URL

**Option C: Using local IPFS node**

For testing or self-hosting:

```bash
# Make sure IPFS daemon is running
ipfs daemon

# Add dist folder to IPFS
ipfs add -r ui/dist

# Pin the content to keep it available
ipfs pin add <IPFS_CID>

# Access via gateway: http://localhost:8080/ipfs/<IPFS_CID>
```

**Option D: Using web3.storage**

Free IPFS/Filecoin storage:

```bash
# Install w3 CLI
npm install -g @web3-storage/w3cli

# Login and upload
w3 login
w3 put ui/dist --name commonality-ui

# Returns IPFS CID and gateway URL
```

#### 3. Configure Environment Variables

Before building, update `ui/.env` with production contract addresses:

```bash
# WalletConnect Project ID (required for wallet connection)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Contract addresses (copy from deployment output)
VITE_BELIEFS_CONTRACT_ADDRESS=0x...
VITE_IMPLICATIONS_CONTRACT_ADDRESS=0x...
# ... etc
```

**Note:** Vite requires `VITE_` prefix for environment variables to be included in the build.

#### 4. Update Contract Addresses in Build

After deploying contracts, the UI needs to know the addresses. Two approaches:

**Option A: Build-time configuration (simpler)**
- Update `ui/.env` with contract addresses
- Rebuild UI: `npm run build`
- Deploy new build to IPFS

**Option B: Runtime configuration (more flexible)**
- Store contract addresses in a separate JSON file on IPFS
- UI fetches configuration at runtime
- Allows updating contract addresses without rebuilding UI
- See [specs/legal.md](specs/legal.md) for considerations

#### 5. Access the Deployed UI

After deployment, the UI is accessible via:

- **IPFS gateway:** `https://gateway.pinata.cloud/ipfs/<CID>`
- **IPFS protocol:** `ipfs://<CID>` (in IPFS-compatible browsers)
- **Custom domain:** Configure DNS TXT record pointing to IPFS CID
- **ENS domain:** Link ENS name to IPFS content hash

### UI Deployment Checklist

Before deploying UI to production:

- [ ] All smart contracts deployed to target network
- [ ] Contract addresses added to `ui/.env` with `VITE_` prefix
- [ ] WalletConnect Project ID configured
- [ ] Indexer GraphQL endpoint URL configured
- [ ] Build succeeds: `npm run build` in `ui/`
- [ ] Preview works locally: `npm run preview`
- [ ] Test wallet connection with target network
- [ ] Test key workflows (create statement, express belief, etc.)
- [ ] Choose IPFS pinning service (Pinata, Fleek, web3.storage)
- [ ] Upload built UI to IPFS
- [ ] Verify UI loads from IPFS gateway
- [ ] Test end-to-end on deployed infrastructure
- [ ] Consider setting up custom domain (optional)
- [ ] Consider setting up ENS name (optional)

### Continuous Deployment

For automated IPFS deployment on code changes:

**Using GitHub Actions + Pinata:**

```yaml
# .github/workflows/deploy-ui.yml
name: Deploy UI to IPFS

on:
  push:
    branches: [main]
    paths: ['ui/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd ui && npm install && npm run build
      - name: Upload to Pinata
        env:
          PINATA_API_KEY: ${{ secrets.PINATA_API_KEY }}
        run: |
          # Upload ui/dist to Pinata
          # Update DNS/ENS with new CID
```

**Using Fleek:**
- Automatic deployment on git push
- No GitHub Actions needed
- Built-in CDN and custom domains

### Important Notes

1. **Immutability:** Each IPFS deployment gets a unique CID. To update the UI, deploy a new version and update references (DNS, ENS, etc.)

2. **Pinning:** Content must be pinned to remain available on IPFS. Use a pinning service (Pinata, Fleek, web3.storage) for production.

3. **Gateway Performance:** Public IPFS gateways can be slow. Consider using Pinata/Fleek CDN or running your own gateway for better performance.

4. **Environment Variables:** Vite only includes `VITE_*` prefixed variables in the build. Regular `ENV_VAR` won't be accessible.

5. **API Endpoints:** The UI needs to connect to:
   - Ethereum RPC (via WalletConnect/wagmi)
   - Ponder indexer GraphQL endpoint
   - IPFS gateway (for fetching statement content)

   Configure these in the environment or as build-time constants.

### Future Implementation

This UI IPFS deployment process needs to be implemented. Recommended steps:

1. Create deployment script: `ui/scripts/deploy-ipfs.sh`
2. Add deployment documentation to `ui/README.md`
3. Test deployment to Pinata or web3.storage
4. Set up automated deployment (GitHub Actions or Fleek)
5. Configure custom domain or ENS name

See [TODO.md](TODO.md) for tracking implementation progress.

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
