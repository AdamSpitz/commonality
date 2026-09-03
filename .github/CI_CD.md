# CI/CD Pipeline

Commonality uses GitHub Actions for automated testing and deployment.

## Workflows

### 1. CI - Build and Test (`ci.yml`)

**Triggers**: PRs to `dev` or `master`, pushes to `dev` or `master`

**What it does**:
- Runs linter
- Builds the entire project
- Runs fast test suite
- Runs Hardhat contract tests
- Runs UI vitest unit tests

**Purpose**: Catch issues early before merging. This is a fast-check workflow that should complete in ~5-10 minutes.

---

### 2. Deploy to Testnet (`deploy-testnet.yml`)

**Triggers**: Pushes to `master`

**What it does**:

#### Contract Deployment (if contract files changed)
1. Compiles contracts
2. Deploys to Base Sepolia testnet
3. Updates `deployments/base-sepolia.env` with new addresses
4. Regenerates `render.yaml` with updated addresses
5. Commits and pushes the updated files back to master

#### UI Deployment (if UI files changed or contracts were deployed)
1. Builds all 8 UI domains
2. Uploads each to IPFS via Pinata
3. Publishes new IPNS records for each domain
4. ENS contenthash already points to IPNS, so no on-chain transaction needed

**Smart skipping**: The workflow checks if relevant files changed and skips deployment steps if nothing changed.

**Render integration**: Since `render.yaml` has `autoDeploy: true`, Render will automatically redeploy services when master is updated.

---

### 3. Review Gate (`review-gate.yml`)

**Triggers**: PR activity (opened, synchronize, review submitted/dismissed)

**What it does**: Checks that an LLM or human review was posted for the current head commit before allowing merge to `dev`.

**See**: [review-gate.md](../workflow/review-gate.md) for details.

---

## Branch Strategy

```
feature/* → PR → dev → PR → master → auto-deploy to testnet
           ↑         ↑                ↑
        review    review          contracts + UI
        gate      gate            deployed
```

- **feature branches**: Development work
- **dev**: Integration branch (requires review gate)
- **master**: Release branch (auto-deploys to testnet)

---

## Required GitHub Secrets

See [DEPLOYMENT_SECRETS.md](./DEPLOYMENT_SECRETS.md) for the full list of secrets needed for automated deployment.

**Quick setup checklist**:
- [ ] `DEPLOYER_PRIVATE_KEY` - Wallet for paying gas
- [ ] `BASE_SEPOLIA_RPC_URL` - RPC endpoint
- [ ] `CONTRACT_ADMIN_ADDRESS` - Admin wallet address
- [ ] `PINATA_JWT` - IPFS upload token
- [ ] `IPNS_PRIVATE_KEY_TESTNET_*` - 8 keys for UI domains

---

## Manual Deployment Fallback

If CI fails or you need manual control:

```bash
# Deploy contracts
./scripts/deploy-contracts.sh base-sepolia

# Deploy UI
./scripts/deploy-testnet.sh

# Update Render (if render.yaml changed)
git push  # Render auto-deploys from master
```

---

## Monitoring

- **GitHub Actions tab**: View workflow runs and logs
- **Render dashboard**: Check service health and deployment status
- **Testnet URLs**: Verify UI is accessible at `*.testnet.commonality.works`

---

## Troubleshooting

### Workflow fails with "secret not found"
- Check that all required secrets are configured in GitHub Settings
- See [DEPLOYMENT_SECRETS.md](./DEPLOYMENT_SECRETS.md)

### Contract deployment fails
- Ensure deployer wallet has ETH on Base Sepolia
- Check RPC URL is correct and accessible
- Verify CONTRACT_ADMIN_ADDRESS is different from DEPLOYER_ADDRESS

### UI deployment fails
- Check PINATA_JWT is valid
- Verify all IPNS_PRIVATE_KEY_TESTNET_* secrets are set
- Check operator secrets file format is correct

### Render doesn't auto-deploy
- Verify Render is connected to the correct branch (master)
- Check that `autoDeploy: true` is in render.yaml
- Look at Render dashboard for build errors

---

## Cost Considerations

- **GitHub Actions**: Free tier includes 2000 minutes/month for public repos
- **Pinata**: Free tier covers a few CIDs; paid starts at ~$20/mo
- **Base Sepolia**: Testnet ETH is free from faucets
- **Render**: Starter plan for most services (~$7-19/mo each)

The CI workflow runs on every PR, so be mindful of long-running tests. The deployment workflow only runs on master merges, which should be infrequent.
