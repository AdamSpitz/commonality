/**
 * Test setup - loads environment variables from .env.local
 */

import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from the integration-tests directory
config({ path: join(__dirname, '..', '.env.local') });
