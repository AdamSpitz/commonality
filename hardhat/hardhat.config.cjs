require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-solhint");
require("solidity-docgen");

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath, protectedKeys) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    if (protectedKeys.has(key)) continue;
    process.env[key] = trimmed.slice(index + 1);
  }
}

// Let `npx hardhat run ... --network base-sepolia` work after running
// scripts/generate-wallets.mjs, without requiring the operator to export vars by hand.
// Real shell environment variables still win over values from files.
const initiallySetEnvKeys = new Set(Object.keys(process.env));
const repoRoot = path.join(__dirname, "..");
loadEnvFile(path.join(repoRoot, ".env"), initiallySetEnvKeys);
loadEnvFile(path.join(repoRoot, "deployments", "operator-addresses.env"), initiallySetEnvKeys);
loadEnvFile(path.join(repoRoot, ".env.secrets"), initiallySetEnvKeys);
loadEnvFile(process.env.COMMONALITY_OPERATOR_SECRETS_FILE || path.join(process.env.HOME || "", ".secrets", "commonality", "operator.env"), initiallySetEnvKeys);

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.33",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      evmVersion: "cancun"
    }
  },
  docgen: {
    output: "./docs/contracts",
    clear: true,
  },
  networks: {
    localhost: {
      url: process.env.HARDHAT_NETWORK_URL || "http://127.0.0.1:8545",
      timeout: 120000
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      timeout: 120000
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      timeout: 120000
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

module.exports = config;
