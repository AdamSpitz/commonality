#!/usr/bin/env npx tsx
/**
 * Syncs ABI files from Hardhat compiled artifacts to the SDK.
 *
 * Usage: npm run sync-abis
 *
 * This script:
 * 1. Runs `npm run build` in the hardhat directory to compile contracts
 * 2. Reads the compiled artifacts
 * 3. Generates TypeScript ABI files in sdk/abis/
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = join(__dirname, "..");
const HARDHAT_ROOT = join(SDK_ROOT, "..", "hardhat");
const ABIS_DIR = join(SDK_ROOT, "abis");

const CONTRACTS_TO_SYNC: Record<string, { artifactPath: string; outputFile: string } | null> = {
  Beliefs: { artifactPath: "statements/Beliefs.sol/Beliefs.json", outputFile: "BeliefsAbi.ts" },
  Implications: { artifactPath: "statements/Implications.sol/Implications.json", outputFile: "ImplicationsAbi.ts" },
  TrustRegistry: { artifactPath: "subjectiv/TrustRegistry.sol/TrustRegistry.json", outputFile: "TrustRegistryAbi.ts" },
  AlignmentAttestations: { artifactPath: "alignment-attestations/AlignmentAttestations.sol/AlignmentAttestations.json", outputFile: "AlignmentAttestationsAbi.ts" },
  DelegatableNotes: { artifactPath: "delegation/DelegatableNotes.sol/DelegatableNotes.json", outputFile: "DelegatableNotesAbi.ts" },
  NoteIntent: { artifactPath: "delegation/NoteIntent.sol/NoteIntent.json", outputFile: "NoteIntentAbi.ts" },
  MutableRefUpdater: { artifactPath: "utils/MutableRefUpdater.sol/MutableRefUpdater.json", outputFile: "MutableRefUpdaterAbi.ts" },
  PremintingERC1155: { artifactPath: "utils/PremintingERC1155.sol/PremintingERC1155.json", outputFile: "PremintingERC1155Abi.ts" },
  MultiERC1155AssuranceContract: { artifactPath: "individual-projects/AssuranceContracts.sol/MultiERC1155AssuranceContract.json", outputFile: "AssuranceContractAbi.ts" },
  ERC1155SecondaryMarket: { artifactPath: "marketplace/ERC1155SecondaryMarket.sol/ERC1155SecondaryMarket.json", outputFile: "ERC1155SecondaryMarketAbi.ts" },
  Pubstarter: { artifactPath: "individual-projects/Pubstarter.sol/Pubstarter.json", outputFile: "PubstarterAbi.ts" },
  FreeERC1155Factory: { artifactPath: "individual-projects/Pubstarter.sol/FreeERC1155Factory.json", outputFile: "FreeERC1155FactoryAbi.ts" },
  PremintingERC1155Factory: { artifactPath: "individual-projects/Pubstarter.sol/PremintingERC1155Factory.json", outputFile: "PremintingERC1155FactoryAbi.ts" },
  MarketplaceFactory: { artifactPath: "individual-projects/Pubstarter.sol/MarketplaceFactory.json", outputFile: "MarketplaceFactoryAbi.ts" },
  AssuranceContractFactory: { artifactPath: "individual-projects/Pubstarter.sol/AssuranceContractFactory.json", outputFile: "AssuranceContractFactoryAbi.ts" },
  ValueThresholdConditionFactory: { artifactPath: "individual-projects/Pubstarter.sol/ValueThresholdConditionFactory.json", outputFile: "ValueThresholdConditionFactoryAbi.ts" },
};

function main() {
  console.log("Syncing ABIs from Hardhat artifacts to SDK...\n");

  console.log("Step 1: Compiling contracts...");
  try {
    execSync("npm run build", {
      cwd: HARDHAT_ROOT,
      stdio: "inherit",
    });
  } catch {
    console.error("Failed to compile contracts. Make sure hardhat dependencies are installed.");
    process.exit(1);
  }

  console.log("\nStep 2: Extracting ABIs...");

  for (const [contractName, entry] of Object.entries(CONTRACTS_TO_SYNC)) {
    if (!entry) {
      console.log(`  - ${contractName}: (skipped)`);
      continue;
    }

    const fullPath = join(HARDHAT_ROOT, "artifacts", "contracts", entry.artifactPath);

    if (!existsSync(fullPath)) {
      console.error(`  ✗ ${contractName}: Artifact not found at ${fullPath}`);
      continue;
    }

    try {
      const artifact = JSON.parse(readFileSync(fullPath, "utf-8"));
      const abi = artifact.abi;

      const tsContent = `// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run \`npm run sync-abis\` to regenerate

export const ${contractName}Abi = ${JSON.stringify(abi, null, 2)} as const;
`;

      const outputPath = join(ABIS_DIR, entry.outputFile);
      writeFileSync(outputPath, tsContent);
      console.log(`  ✓ ${entry.outputFile}`);
    } catch (error) {
      console.error(`  ✗ ${contractName}: ${error}`);
    }
  }

  console.log("\nDone! ABIs synced successfully.");
}

main();
