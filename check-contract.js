// Quick script to check if contracts are configured
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from the same place Ponder does
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

console.log('Environment variables:');
console.log('MUTABLE_REF_UPDATER_CONTRACT_ADDRESS:', process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS);
console.log('BELIEFS_CONTRACT_ADDRESS:', process.env.BELIEFS_CONTRACT_ADDRESS);
console.log('IMPLICATIONS_CONTRACT_ADDRESS:', process.env.IMPLICATIONS_CONTRACT_ADDRESS);

const MUTABLE_REF_UPDATER_ADDRESS = (process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS && process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS !== '') ? process.env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS : undefined;

console.log('\nParsed values:');
console.log('MUTABLE_REF_UPDATER_ADDRESS:', MUTABLE_REF_UPDATER_ADDRESS);
console.log('Will index MutableRefUpdater?', MUTABLE_REF_UPDATER_ADDRESS !== undefined);
