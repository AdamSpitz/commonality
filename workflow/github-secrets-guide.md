# GitHub Secrets Setup Guide

## Quick Start (One Command)

If you have GitHub CLI installed and authenticated:

```bash
./scripts/setup-github-secrets-auto.sh
```

This will extract all required secrets from your local files and set them in GitHub automatically.

---

## Understanding Where Secrets Live

### File Structure

```
.env.secrets                          # Service/runtime secrets (in repo, gitignored)
~/.secrets/commonality/operator.env   # Operator/deployment secrets (outside repo)
deployments/operator-addresses.env    # Public addresses (committed to repo)
```

### Which Secret Is In Which File?

| Secret | File | Purpose |
|--------|------|---------|
| `DEPLOYER_PRIVATE_KEY` | `operator.env` | Pays gas for contract deployments |
| `BASE_SEPOLIA_RPC_URL` | `.env.secrets` | RPC endpoint for Base Sepolia |
| `CONTRACT_ADMIN_ADDRESS` | `operator-addresses.env` | Receives contract ownership |
| `PINATA_JWT` | `operator.env` | IPFS upload authentication |
| `IPNS_PRIVATE_KEY_TESTNET_*` | `operator.env` | IPNS keys for 8 UI domains |

### How Scripts Find Secrets

The scripts use `scripts/lib/secrets.sh` which searches in this order:
1. Operator secrets file (`~/.secrets/commonality/operator.env`)
2. Service secrets file (`.env.secrets`)
3. Operator addresses file (`deployments/operator-addresses.env`)

---

## Manual Setup (Without gh CLI)

If you prefer the GitHub web interface:

1. Go to: https://github.com/AdamSpitz/commonality/settings/secrets/actions
2. Click "New repository secret" for each of these:

### Contract Deployment (3 secrets)

**`DEPLOYER_PRIVATE_KEY`**
```bash
# Extract from operator.env:
grep DEPLOYER_PRIVATE_KEY ~/.secrets/commonality/operator.env
```

**`BASE_SEPOLIA_RPC_URL`**
```bash
# Extract from .env.secrets:
grep BASE_SEPOLIA_RPC_URL .env.secrets
```

**`CONTRACT_ADMIN_ADDRESS`**
```bash
# Extract from operator-addresses.env:
grep CONTRACT_ADMIN_ADDRESS deployments/operator-addresses.env
```

### UI Deployment (9 secrets)

**`PINATA_JWT`**
```bash
grep PINATA_JWT ~/.secrets/commonality/operator.env
```

**IPNS Keys (8 total):**
```bash
grep IPNS_PRIVATE_KEY_TESTNET_ ~/.secrets/commonality/operator.env
```

Copy each value and paste into GitHub's secret form.

---

## Prerequisites Check

Before running the automated script, ensure you have:

### 1. Generated Wallets
```bash
node scripts/generate-wallets.mjs
```
This creates:
- `.env.secrets` (service hot keys)
- `~/.secrets/commonality/operator.env` (operator secrets)
- `deployments/operator-addresses.env` (public addresses)

### 2. Deployed Contracts At Least Once
```bash
./scripts/deploy-contracts.sh base-sepolia
```
This populates `deployments/base-sepolia.env` with contract addresses.

### 3. Generated IPNS Keys
```bash
./scripts/setup-testnet-naming.sh
```
This generates all 8 IPNS keys and stores them in operator.env.

### 4. GitHub CLI Installed
```bash
# macOS
brew install gh

# Linux
sudo apt install gh

# Then authenticate
gh auth login
```

---

## Verification

After setting secrets, verify they're correct:

```bash
# List all secrets (doesn't show values)
gh secret list

# Test by triggering a deployment
echo "// test" >> README.md
git add README.md
git commit -m "Test CI/CD"
git push origin master
```

Watch the Actions tab: https://github.com/AdamSpitz/commonality/actions

---

## Troubleshooting

### Script says "secret not found"

Check that the value exists in one of these files:
```bash
# Search all secret files
grep SECRET_NAME ~/.secrets/commonality/operator.env .env.secrets deployments/operator-addresses.env
```

### gh CLI not authenticated
```bash
gh auth login
```

### Missing IPNS keys
```bash
# Generate all at once
./scripts/setup-testnet-naming.sh

# Or generate individually
./scripts/setup-ipns-key.sh
```

### Missing CONTRACT_ADMIN_ADDRESS
This is generated when you deploy contracts. If it's missing:
```bash
# Re-deploy contracts
./scripts/deploy-contracts.sh base-sepolia
```

---

## Security Notes

⚠️ **These secrets give full control over your testnet:**
- Deployer key can deploy/upgrade contracts
- IPNS keys can change what UI users see
- Pinata JWT can upload arbitrary content to IPFS

**Best practices:**
- Rotate keys periodically
- Use separate wallets for different purposes
- Monitor deployment activity
- Never share these secrets
- Consider using GitHub environments for additional protection

---

## What Happens After Setup

Once secrets are configured:

1. **On PR to dev/master:**
   - CI runs lint, build, tests (~5-10 min)
   - Review gate checks for LLM review

2. **On merge to master:**
   - Contracts deploy to Base Sepolia (if changed)
   - UI deploys to IPFS/IPNS (if changed)
   - render.yaml updates with new addresses
   - Render auto-deploys services

3. **You get:**
   - Fully automated testnet deployments
   - Consistent, repeatable process
   - Full audit trail in GitHub Actions
   - No manual deployment steps needed

---

## Need Help?

- See `.github/DEPLOYMENT_SECRETS.md` for detailed secret descriptions
- See `.github/CI_CD.md` for full CI/CD documentation
- See `workflow/deployment.md` for deployment architecture
