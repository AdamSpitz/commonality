import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env file found at', envPath);
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
};

export const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';

export function getContractAddress(name) {
  const address = CONTRACT_ADDRESSES[name];
  if (!address) {
    throw new Error(`Contract address not found for: ${name}`);
  }
  return address;
}
