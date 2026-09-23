#!/usr/bin/env npx tsx
/**
 * Syncs ABI files from Hardhat compiled artifacts to the SDK.
 *
 * Usage: npm run sync-abis [-- --check] [-- --capability all|conceptspace]
 *
 * `--capability conceptspace` writes only the non-financial ABIs and does not
 * require funding artifacts. The default is `all`.
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

type AbiCapability = "conceptspace" | "funding";

type AbiSyncEntry = {
  artifactPath: string;
  outputFile: string;
  capability: AbiCapability;
};

const CONTRACTS_TO_SYNC: Record<string, AbiSyncEntry> = {
  Beliefs: { artifactPath: "statements/Beliefs.sol/Beliefs.json", outputFile: "BeliefsAbi.ts", capability: "conceptspace" },
  Implications: { artifactPath: "statements/Implications.sol/Implications.json", outputFile: "ImplicationsAbi.ts", capability: "conceptspace" },
  PublishedData: { artifactPath: "published-data/PublishedData.sol/PublishedData.json", outputFile: "PublishedDataAbi.ts", capability: "conceptspace" },
  BeneficiaryIdentity: { artifactPath: "identity/BeneficiaryIdentity.sol/BeneficiaryIdentity.json", outputFile: "BeneficiaryIdentityAbi.ts", capability: "conceptspace" },
  TrustRegistry: { artifactPath: "subjectiv/TrustRegistry.sol/TrustRegistry.json", outputFile: "TrustRegistryAbi.ts", capability: "conceptspace" },
  AccountAssertions: { artifactPath: "subjectiv/AccountAssertions.sol/AccountAssertions.json", outputFile: "AccountAssertionsAbi.ts", capability: "conceptspace" },
  AlignmentAttestations: { artifactPath: "alignment-attestations/AlignmentAttestations.sol/AlignmentAttestations.json", outputFile: "AlignmentAttestationsAbi.ts", capability: "conceptspace" },
  MutableRefUpdater: { artifactPath: "utils/MutableRefUpdater.sol/MutableRefUpdater.json", outputFile: "MutableRefUpdaterAbi.ts", capability: "conceptspace" },
  NudgePublications: { artifactPath: "nudger/NudgePublications.sol/NudgePublications.json", outputFile: "NudgePublicationsAbi.ts", capability: "conceptspace" },
  DelegatableNotes: { artifactPath: "delegation/DelegatableNotes.sol/DelegatableNotes.json", outputFile: "DelegatableNotesAbi.ts", capability: "funding" },
  RecurringPledges: { artifactPath: "delegation/RecurringPledges.sol/RecurringPledges.json", outputFile: "RecurringPledgesAbi.ts", capability: "funding" },
  NoteIntent: { artifactPath: "delegation/NoteIntent.sol/NoteIntent.json", outputFile: "NoteIntentAbi.ts", capability: "funding" },
  PremintingERC1155: { artifactPath: "utils/PremintingERC1155.sol/PremintingERC1155.json", outputFile: "PremintingERC1155Abi.ts", capability: "funding" },
  MultiERC1155AssuranceContract: { artifactPath: "individual-projects/AssuranceContracts.sol/MultiERC1155AssuranceContract.json", outputFile: "AssuranceContractAbi.ts", capability: "funding" },
  BeneficiaryAssuranceContract: { artifactPath: "individual-projects/BeneficiaryAssuranceContract.sol/BeneficiaryAssuranceContract.json", outputFile: "BeneficiaryAssuranceContractAbi.ts", capability: "funding" },
  ProjectFactory: { artifactPath: "individual-projects/ProjectFactory.sol/ProjectFactory.json", outputFile: "ProjectFactoryAbi.ts", capability: "funding" },
  PremintingERC1155Factory: { artifactPath: "individual-projects/ProjectFactory.sol/PremintingERC1155Factory.json", outputFile: "PremintingERC1155FactoryAbi.ts", capability: "funding" },
  AssuranceContractFactory: { artifactPath: "individual-projects/ProjectFactory.sol/AssuranceContractFactory.json", outputFile: "AssuranceContractFactoryAbi.ts", capability: "funding" },
  ValueThresholdConditionFactory: { artifactPath: "individual-projects/ProjectFactory.sol/ValueThresholdConditionFactory.json", outputFile: "ValueThresholdConditionFactoryAbi.ts", capability: "funding" },
  ValueThresholdCondition: { artifactPath: "individual-projects/ValueThresholdCondition.sol/ValueThresholdCondition.json", outputFile: "ValueThresholdConditionAbi.ts", capability: "funding" },
  ContentRegistry: { artifactPath: "content-funding/ContentRegistry.sol/ContentRegistry.json", outputFile: "ContentRegistryAbi.ts", capability: "funding" },
  BeneficiaryRegistry: { artifactPath: "content-funding/BeneficiaryRegistry.sol/BeneficiaryRegistry.json", outputFile: "BeneficiaryRegistryAbi.ts", capability: "funding" },
  BeneficiaryEscrow: { artifactPath: "content-funding/BeneficiaryEscrow.sol/BeneficiaryEscrow.json", outputFile: "BeneficiaryEscrowAbi.ts", capability: "funding" },
  CreatorAssuranceContractFactory: { artifactPath: "content-funding/CreatorAssuranceContractFactory.sol/CreatorAssuranceContractFactory.json", outputFile: "CreatorAssuranceContractFactoryAbi.ts", capability: "funding" },
  CreatorAssuranceVeto: { artifactPath: "content-funding/CreatorAssuranceVeto.sol/CreatorAssuranceVeto.json", outputFile: "CreatorAssuranceVetoAbi.ts", capability: "funding" },
  ProspectiveContentRoundFactory: { artifactPath: "content-funding/ProspectiveContentRoundFactory.sol/ProspectiveContentRoundFactory.json", outputFile: "ProspectiveContentRoundFactoryAbi.ts", capability: "funding" },
  MaterializedContentTokens: { artifactPath: "content-funding/MaterializedContentTokens.sol/MaterializedContentTokens.json", outputFile: "MaterializedContentTokensAbi.ts", capability: "funding" },
};

function capabilityFromArgv(argv: string[]): "all" | AbiCapability {
  const index = argv.indexOf("--capability");
  const value = index === -1 ? "all" : argv[index + 1];
  if (value === "all" || value === "conceptspace" || value === "funding") return value;
  console.error(`Invalid ABI capability "${value}". Expected all, conceptspace, or funding.`);
  process.exit(1);
}

function contractsForCapability(capability: "all" | AbiCapability): Array<[string, AbiSyncEntry]> {
  return Object.entries(CONTRACTS_TO_SYNC).filter(([, entry]) =>
    capability === "all" ? true : entry.capability === capability,
  );
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const capability = capabilityFromArgv(process.argv);
  const contracts = contractsForCapability(capability);
  let failed = false;

  console.log(`${checkOnly ? "Checking" : "Syncing"} ${capability} ABIs against Hardhat artifacts...\n`);

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

  for (const [contractName, entry] of contracts) {
    const fullPath = join(HARDHAT_ROOT, "artifacts", "contracts", entry.artifactPath);

    if (!existsSync(fullPath)) {
      console.error(`  ✗ ${contractName}: Artifact not found at ${fullPath}`);
      failed = true;
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
      if (checkOnly) {
        if (!existsSync(outputPath) || readFileSync(outputPath, "utf-8") !== tsContent) {
          console.error(`  ✗ ${entry.outputFile}: out of date (run npm run sync-abis)`);
          failed = true;
        } else {
          console.log(`  ✓ ${entry.outputFile}`);
        }
      } else {
        writeFileSync(outputPath, tsContent);
        console.log(`  ✓ ${entry.outputFile}`);
      }
    } catch (error) {
      console.error(`  ✗ ${contractName}: ${error}`);
      failed = true;
    }
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log(`\nDone! ABIs ${checkOnly ? "are current" : "synced successfully"}.`);
}

main();
