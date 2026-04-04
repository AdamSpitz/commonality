import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Guard: these scripts must be run from the fake-data-generation/ directory
// (i.e. via `npm run gen:*` or `tsx <script>.ts` from within this directory).
// Running from elsewhere (e.g. the project root or hardhat/) will cause subtle
// failures because npm script resolution and any cwd-relative paths won't work.
if (basename(process.cwd()) !== 'fake-data-generation') {
  console.warn(
    `Warning: fake-data scripts should be run from the fake-data-generation/ directory.\n` +
    `  Current directory: ${process.cwd()}\n` +
    `  Expected:          .../fake-data-generation/\n` +
    `  Try: cd fake-data-generation && npm run gen:small`
  );
}

const envPath = join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env file found at', envPath);
}

export function loadEnv(): void {
  // Environment is already loaded at module import time
  // This function exists for explicit re-loading if needed
}

export const CONTRACT_ADDRESSES = {
  beliefs: process.env.BELIEFS_CONTRACT_ADDRESS,
  implications: process.env.IMPLICATIONS_CONTRACT_ADDRESS,
  projectAlignment: process.env.PROJECT_ALIGNMENT_ADDRESS || process.env.PROJECT_ALIGNMENT_CONTRACT_ADDRESS,
  delegatableNotes: process.env.DELEGATABLE_NOTES_ADDRESS || process.env.DELEGATABLE_NOTES_CONTRACT_ADDRESS,
  assuranceContractFactory: process.env.ASSURANCE_CONTRACT_FACTORY_ADDRESS,
  erc1155Factory: process.env.ERC1155_FACTORY_ADDRESS,
  marketplaceFactory: process.env.MARKETPLACE_FACTORY_ADDRESS,
  pubstarter: process.env.PUBSTARTER_ADDRESS,
  mutableRefUpdater: process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS || process.env.MUTABLE_REF_UPDATER_ADDRESS,
  alignmentAttestations: process.env.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS || process.env.ALIGNMENT_ATTESTATIONS_ADDRESS,
} as const satisfies Record<string, string | undefined>;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

export const RPC_URL: string = process.env.RPC_URL || 'http://localhost:8545';

export function getContractAddress(name: ContractName): string {
  const address = CONTRACT_ADDRESSES[name];
  if (!address) {
    throw new Error(`Contract address not found for: ${name}`);
  }
  return address;
}
