# Automated Testnet Deployment - Quick Start

## 🚀 One-Command Setup

```bash
./scripts/setup-github-secrets-auto.sh
```

That's it! This extracts all required secrets from your local files and configures GitHub Actions.

---

## 📋 What You Get

### Before (Manual)
```bash
# Every time you want to deploy:
./scripts/deploy-contracts.sh base-sepolia    # Deploy contracts
node scripts/generate-render-yaml.mjs          # Update Render config
git add && git commit && git push              # Push to trigger Render
./scripts/deploy-testnet.sh                    # Deploy UI to IPFS
# Wait for each step, check for errors, repeat if needed
```

### After (Automated)
```bash
# Just merge to master:
git merge feature/my-change master
git push

# Everything else happens automatically:
# ✅ Contracts deployed to Base Sepolia
# ✅ UI published to IPFS/IPNS
# ✅ Render services updated
# ✅ All addresses synchronized
```

---

## 🔧 How It Works

### File Locations

Your secrets are already in these files:

```
~/.secrets/commonality/operator.env    ← DEPLOYER_PRIVATE_KEY, PINATA_JWT, IPNS keys
.env.secrets                           ← BASE_SEPOLIA_RPC_URL
deployments/operator-addresses.env     ← CONTRACT_ADMIN_ADDRESS
```

The setup script reads these and pushes them to GitHub Secrets.

### Deployment Flow

```
Merge to master
       │
       ├─→ Check: Did contract files change?
       │         ├─ Yes → Deploy to Base Sepolia
       │         │        ├─ Update deployments/base-sepolia.env
       │         │        └─ Regenerate render.yaml
       │         └─ No  → Skip
       │
       ├─→ Check: Did UI files change OR contracts deployed?
       │         ├─ Yes → Build all 8 UI domains
       │         │        ├─ Upload to IPFS via Pinata
       │         │        └─ Update IPNS records
       │         └─ No  → Skip
       │
       └─→ Render auto-deploys from master (autoDeploy: true)
```

### Smart Skipping

The workflow only deploys what changed:
- No contract changes? → Skip contract deployment
- No UI changes? → Skip UI deployment
- Saves time and money

---

## ✅ Prerequisites

You need these files already created:

1. **Generated wallets:**
   ```bash
   node scripts/generate-wallets.mjs
   ```

2. **IPNS keys:**
   ```bash
   ./scripts/setup-testnet-naming.sh
   ```

3. **At least one contract deployment:**
   ```bash
   ./scripts/deploy-contracts.sh base-sepolia
   ```

4. **GitHub CLI installed:**
   ```bash
   brew install gh      # macOS
   gh auth login        # Authenticate
   ```

If you don't have these yet, see `workflow/github-secrets-guide.md`.

---

## 🎯 Testing It Out

After running the setup script:

```bash
# Make a small change
echo "// test" >> README.md
git add README.md
git commit -m "Test automated deployment"
git push origin master
```

Then watch:
- **Actions tab:** https://github.com/AdamSpitz/commonality/actions
- **Render dashboard:** Check services redeploy
- **Testnet URLs:** Visit https://commonality.testnet.commonality.works

---

## 📊 What Gets Deployed

### Contracts (if changed)
- All smart contracts to Base Sepolia
- Updates `deployments/base-sepolia.env` with new addresses
- Commits updated addresses back to master

### UI (if changed)
All 8 domains to IPFS/IPNS:
- commonality.testnet.commonality.works
- aligning.works (alignment)
- lazygiving.testnet.commonality.works
- tally.testnet.commonality.works
- content-funding.testnet.commonality.works
- civility.testnet.commonality.works
- common-sense-majority.testnet.commonality.works
- conceptspace.testnet.commonality.works

### Render Services
Auto-deploys from master:
- cause-assist
- coherence-badge-worker
- platform-api
- indexer
- attesters
- etc.

---

## 🔍 Monitoring

### Check Deployment Status
```bash
# View recent workflow runs
gh run list --limit 5

# View specific run
gh run view <run-id>

# Watch logs in real-time
gh run watch <run-id>
```

### Verify Deployment
```bash
# Check contract addresses
cat deployments/base-sepolia.env | grep CONTRACT_ADDRESS

# Check UI CIDs
ls data/ui-ipfs/

# Test UI accessibility
curl -I https://commonality.testnet.commonality.works
```

---

## 🆘 Troubleshooting

### Workflow fails with "secret not found"
```bash
# Re-run setup script
./scripts/setup-github-secrets-auto.sh

# Or check manually
gh secret list
```

### Contracts didn't deploy
- Check deployer wallet has ETH on Base Sepolia
- Verify RPC URL is working
- Check Actions logs for error messages

### UI didn't deploy
- Verify PINATA_JWT is valid
- Check all IPNS keys are set
- Ensure operator.env file has all keys

### Render didn't update
- Verify Render is watching master branch
- Check render.yaml was committed
- Look at Render dashboard for build errors

---

## 💰 Cost Considerations

- **GitHub Actions:** Free for public repos (2000 min/month)
- **Pinata:** Free tier covers a few CIDs (~$20/mo for more)
- **Base Sepolia:** Testnet ETH is free
- **Render:** ~$7-19/mo per service

The workflow only runs on master merges, so costs are minimal.

---

## 📚 Documentation

- **Setup guide:** `workflow/github-secrets-guide.md`
- **CI/CD docs:** `.github/CI_CD.md`
- **Secret details:** `.github/DEPLOYMENT_SECRETS.md`
- **Deployment architecture:** `workflow/deployment.md`

---

## 🎉 You're Done!

After setup, you never need to manually deploy again. Just:

1. Work on feature branches
2. Merge to dev (with review)
3. Merge dev to master
4. **Everything deploys automatically**

Your local machine stays light — just nvim + git + AI harness. The heavy lifting happens in CI.
