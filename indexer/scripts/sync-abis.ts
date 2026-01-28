#!/usr/bin/env npx tsx
/**
 * Syncs ABI files from Hardhat compiled artifacts to the indexer.
 *
 * Usage: npm run sync-abis
 *
 * This script:
 * 1. Runs `npm run build` in the hardhat directory to compile contracts
 * 2. Reads the compiled artifacts
 * 3. Generates TypeScript ABI files in indexer/abis/
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEXER_ROOT = join(__dirname, "..");
const HARDHAT_ROOT = join(INDEXER_ROOT, "..", "hardhat");
const ABIS_DIR = join(INDEXER_ROOT, "abis");

// Map of contract names to their artifact paths (relative to hardhat/artifacts/contracts)
const CONTRACTS_TO_SYNC = {
  Beliefs: "statements/Beliefs.sol/Beliefs.json",
  Implications: "statements/Implications.sol/Implications.json",
  AlignmentAttestations: "alignment-attestations/AlignmentAttestations.sol/AlignmentAttestations.json",
  // Add more contracts as needed:
  // AssuranceContract: "individual-projects/AssuranceContract.sol/AssuranceContract.json",
  // DelegatableNotes: "delegation/DelegatableNotes.sol/DelegatableNotes.json",
  // ERC1155SecondaryMarket: "marketplace/ERC1155SecondaryMarket.sol/ERC1155SecondaryMarket.json",
};

function main() {
  console.log("Syncing ABIs from Hardhat artifacts...\n");

  // Step 1: Compile contracts
  console.log("Step 1: Compiling contracts...");
  try {
    execSync("npm run build", {
      cwd: HARDHAT_ROOT,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to compile contracts. Make sure hardhat dependencies are installed.");
    process.exit(1);
  }

  // Step 2: Extract and write ABIs
  console.log("\nStep 2: Extracting ABIs...");

  for (const [contractName, artifactPath] of Object.entries(CONTRACTS_TO_SYNC)) {
    const fullPath = join(HARDHAT_ROOT, "artifacts", "contracts", artifactPath);

    if (!existsSync(fullPath)) {
      console.error(`  ✗ ${contractName}: Artifact not found at ${fullPath}`);
      continue;
    }

    try {
      const artifact = JSON.parse(readFileSync(fullPath, "utf-8"));
      const abi = artifact.abi;

      // Generate TypeScript file
      const tsContent = `// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run \`npm run sync-abis\` to regenerate

export const ${contractName}Abi = ${JSON.stringify(abi, null, 2)} as const;
`;

      const outputPath = join(ABIS_DIR, `${contractName}Abi.ts`);
      writeFileSync(outputPath, tsContent);
      console.log(`  ✓ ${contractName}Abi.ts`);
    } catch (error) {
      console.error(`  ✗ ${contractName}: ${error}`);
    }
  }

  console.log("\nDone! ABIs synced successfully.");
}

main();
