# CI/CD Setup Summary

## What Was Created

### GitHub Actions Workflows

1. **`.github/workflows/ci.yml`** - Fast checks on PRs and pushes
   - Linting, building, fast tests, contract tests, UI tests
   - Runs on PRs to dev/master and pushes to dev/master

2. **`.github/workflows/deploy-testnet.yml`** - Automated testnet deployment
   - Deploys contracts to Base Sepolia when contract files change
   - Deploys all UI domains to IPFS/IPNS when UI files change
   - Updates render.yaml with new contract addresses
   - Only runs on master branch pushes
   - Smart skipping: only deploys what changed

3. **`.github/workflows/review-gate.yml`** - Already existed
   - Checks for LLM/human review before merging to dev

### Documentation

1. **`.github/DEPLOYMENT_SECRETS.md`** - Complete list of required GitHub secrets
2. **`.github/CI_CD.md`** - Full CI/CD documentation
3. **`workflow/ci-cd-setup.md`** - This file (setup summary)

---

## Next Steps

### 1. Configure GitHub Secrets

Go to: https://github.com/AdamSpitz/commonality/settings/secrets/actions

Add these secrets (see `.github/DEPLOYMENT_SECRETS.md` for details):

**Contract Deployment:**
- `DEPLOYER_PRIVATE_KEY`
- `BASE_SEPOLIA_RPC_URL`
- `CONTRACT_ADMIN_ADDRESS`
- `CONTRACT_ADMIN_PRIVATE_KEY`

**UI Deployment:**
- `PINATA_JWT`
- `IPNS_PRIVATE_KEY_TESTNET_COMMONALITY`
- `IPNS_PRIVATE_KEY_TESTNET_LAZYGIVING`
- `IPNS_PRIVATE_KEY_TESTNET_ALIGNMENT`
- `IPNS_PRIVATE_KEY_TESTNET_TALLY`
- `IPNS_PRIVATE_KEY_TESTNET_CONTENT_FUNDING`
- `IPNS_PRIVATE_KEY_TESTNET_CIVILITY`
- `IPNS_PRIVATE_KEY_TESTNET_COMMON_SENSE_MAJORITY`
- `IPNS_PRIVATE_KEY_TESTNET_CONCEPTSPACE`

### 2. Verify Render Configuration

Log into Render dashboard and verify:
- Services are connected to the correct repository
- Branch is set to `master`
- Auto-deploy is enabled (should be, since `autoDeploy: true` in render.yaml)

### 3. Test the Setup

Use the next reviewed `dev` → `master` release PR to trigger the deployment workflow:

```bash
gh pr create --base master --head dev --title "Promote dev to master"
```

Watch the Actions tab: https://github.com/AdamSpitz/commonality/actions

### 4. Monitor First Deployment

After the first automated deployment:
- Check that contracts were deployed to Base Sepolia
- Verify UI is accessible at testnet URLs
- Confirm Render services redeployed
- Check that render.yaml was updated with correct addresses

---

## How It Works

### On PR to dev or master:
```
PR created → CI workflow runs → Lint + Build + Tests
           → If all pass → Can merge (after review gate)
```

### On merge to master:
```
Merge to master → Deploy workflow runs
                → Check if contracts changed → Deploy if yes
                → Check if UI changed → Deploy if yes
                → Update render.yaml → Open metadata PR into dev
                → Release metadata to master → Render and UI deploy
```

### Smart Skipping:
- If no contract files changed → Skip contract deployment
- If no UI files changed AND no contracts deployed → Skip UI deployment
- This prevents unnecessary deployments and saves time/money

---

## Benefits

✅ **Automated quality gates** - Catches issues before they reach master
✅ **Consistent deployments** - Same process every time, no manual errors
✅ **Fast feedback** - CI runs in ~5-10 minutes on PRs
✅ **Cost efficient** - Only deploys what changed
✅ **Audit trail** - All deployments logged in GitHub Actions
✅ **Team collaboration** - Everyone sees same testnet state

---

## Troubleshooting

If workflows fail:
1. Check Actions tab for error messages
2. Verify all secrets are configured correctly
3. Check that Render is watching master branch
4. See `.github/CI_CD.md` for detailed troubleshooting

If you need to deploy manually:
```bash
./scripts/deploy-contracts.sh base-sepolia
./scripts/deploy-testnet.sh
```

---

## Questions?

- See `.github/CI_CD.md` for full documentation
- See `.github/DEPLOYMENT_SECRETS.md` for secret setup details
- See `workflow/deployment.md` for deployment architecture
