# AI Critique: Local Deployment and Wallet Setup Guide
**Date:** Tuesday, March 31, 2026

## Analysis of the Setup Process
The request asks for a practical "How-To" for a developer who wants to move beyond just running scripts and actually *experience* the system as a user.

### 1. Spinning up the Local Deployment
The project provides a streamlined way to do this using Docker and a seeding script.
*   **Step 1: Start Services**
    ```bash
    ./scripts/services.sh --start
    ```
    This launches the Hardhat node (at `http://localhost:8545`), IPFS, and the Ponder indexer.
*   **Step 2: Seed with Hardhat Accounts**
    ```bash
    ./scripts/data.sh --seed=medium --use-hardhat-accounts
    ```
    The `--use-hardhat-accounts` flag is the "magic" here. It tells the generator to use the well-known Hardhat private keys for the first 20 users. This ensures that the actions recorded in the system (beliefs, delegations, etc.) are tied to accounts you can actually control in your browser.

---

## 2. Setting up your Browser Wallet (MetaMask)

To see the UI "through the eyes" of a simulated user, follow these steps:

### A. Add the Hardhat Network
1. Open MetaMask and go to **Settings > Networks > Add a network**.
2. Click **Add a network manually**.
3. Use these settings:
    *   **Network Name:** Hardhat Local
    *   **New RPC URL:** `http://127.0.0.1:8545`
    *   **Chain ID:** `31337`
    *   **Currency Symbol:** `ETH`

### B. Import a Hardhat Account
The simulation uses the first 20 Hardhat accounts. To use the **0th user** (the most active one in many simulations):
1. In MetaMask, click the **Account Circle** then **Import Account**.
2. Paste the private key for the 0th Hardhat account:
   `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
3. You should see a balance of ~10,000 ETH (Hardhat's default).

### C. Connect to the UI
1. Start the UI: `cd ui && npm run dev`
2. Open `http://localhost:5173`.
3. Click **Connect Wallet** and select the Hardhat account you just imported.

---

## 3. What to Look For in the UI
Once connected as the 0th Hardhat user (`0xf39F...2266`), you can explore the "half-baked" UI's current state:

*   **My Profile:** You should see the list of statements this account "believes" (generated during the `--seed` process).
*   **My Notes:** Check if this account has any **Delegatable Notes**. Since you used `--seed=medium`, the simulation likely performed some `depositToNote` and `delegateNote` actions for this user.
*   **Funding Portals:** Browse projects. You might see that you are listed as a "Contributor" if the simulation purchased tokens for this account.

---

## Strengthening the Experience
*   **Account Switching:** Import the **1st Hardhat account** (`0x59c6...690d`) as well. You can then simulate a "Delegation" between your own two accounts in the UI to see the delegation chain update in real-time.
*   **Verification:** Use the **indexer API** (`http://localhost:42069/api/events`) to verify that the actions you take in the UI are being caught by the indexer.

## Summary
By using the `--use-hardhat-accounts` flag, you bridge the gap between "synthetic data" and "manual testing." This is the best way to debug the UI because it provides a pre-populated "world" where you already have a history, a reputation, and active capital.
