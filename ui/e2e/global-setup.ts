import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

/**
 * Global setup for Playwright E2E tests
 *
 * This script runs before all tests to start the Docker Compose services
 * (hardhat-node, ipfs, indexer) so that E2E tests can interact with a real
 * backend stack.
 *
 * The setup waits for all services to become healthy before allowing tests
 * to run. Docker Compose handles the orchestration via depends_on and
 * healthchecks defined in docker-compose.yml.
 *
 * After services are ready, it copies contract addresses from integration-tests/.env.local
 * to ui/.env so the UI can access them via Vite's import.meta.env.
 */

/**
 * Copy contract addresses from integration-tests/.env.local to ui/.env
 * This makes the deployed contract addresses available to the UI via Vite env vars
 */
function copyContractAddresses(projectRoot: string): void {
  try {
    const integrationEnvPath = resolve(projectRoot, 'integration-tests/.env.local');
    const uiEnvPath = resolve(projectRoot, 'ui/.env');

    // Read the integration tests env file (contains contract addresses)
    const integrationEnv = readFileSync(integrationEnvPath, 'utf-8');

    // Extract contract addresses we need for the UI
    const addressesToCopy = [
      'BELIEFS_CONTRACT_ADDRESS',
      'IMPLICATIONS_CONTRACT_ADDRESS',
      'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
      'DELEGATABLE_NOTES_ADDRESS',
      'NOTE_INTENT_ADDRESS',
      'ASSURANCE_CONTRACT_FACTORY_ADDRESS',
      'ERC1155_FACTORY_ADDRESS',
      'MARKETPLACE_FACTORY_ADDRESS',
      'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
      'PUBSTARTER_ADDRESS',
    ];

    // Parse the addresses
    const addresses: Record<string, string> = {};
    for (const line of integrationEnv.split('\n')) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      for (const key of addressesToCopy) {
        if (trimmedLine.startsWith(`${key}=`)) {
          const value = trimmedLine.substring(key.length + 1);
          addresses[key] = value;
        }
      }
    }

    // Read existing ui/.env file (to preserve VITE_WALLETCONNECT_PROJECT_ID)
    let uiEnv = '';
    try {
      uiEnv = readFileSync(uiEnvPath, 'utf-8');
    } catch {
      // File doesn't exist yet, that's okay
    }

    // Remove any existing auto-populated lines from ui/.env
    const autoPopulatedPrefixes = [
      ...addressesToCopy.map(key => `VITE_${key}=`),
      'VITE_GRAPHQL_URL=',
      'VITE_IPFS_GATEWAY=',
      'VITE_ETH_RPC_URL=',
      'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS=',
      'VITE_NOTE_INTENT_CONTRACT_ADDRESS=',
      'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS=',
      'VITE_ERC1155_FACTORY_ADDRESS=',
      'VITE_MARKETPLACE_FACTORY_ADDRESS=',
      'VITE_IMPLICATIONS_CONTRACT_ADDRESS=',
      'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS=',
      'VITE_PUBSTARTER_CONTRACT_ADDRESS=',
      '# Contract addresses (auto-populated',
    ];
    const existingLines = uiEnv.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return !autoPopulatedPrefixes.some(prefix => trimmedLine.startsWith(prefix));
    });

    // Remove trailing blank lines to prevent accumulation
    while (existingLines.length > 0 && existingLines[existingLines.length - 1].trim() === '') {
      existingLines.pop();
    }

    // Add contract addresses as VITE_ prefixed env vars
    const newLines = [
      ...existingLines,
      '',
      '# Contract addresses (auto-populated by E2E test setup)',
      `VITE_BELIEFS_CONTRACT_ADDRESS=${addresses.BELIEFS_CONTRACT_ADDRESS || ''}`,
      `VITE_IMPLICATIONS_CONTRACT_ADDRESS=${addresses.IMPLICATIONS_CONTRACT_ADDRESS || ''}`,
      `VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS=${addresses.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS || ''}`,
      // Note: DELEGATABLE_NOTES_ADDRESS → VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS (name differs)
      `VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS=${addresses.DELEGATABLE_NOTES_ADDRESS || ''}`,
      `VITE_NOTE_INTENT_CONTRACT_ADDRESS=${addresses.NOTE_INTENT_ADDRESS || ''}`,
      `VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS=${addresses.ASSURANCE_CONTRACT_FACTORY_ADDRESS || ''}`,
      `VITE_ERC1155_FACTORY_ADDRESS=${addresses.ERC1155_FACTORY_ADDRESS || ''}`,
      `VITE_MARKETPLACE_FACTORY_ADDRESS=${addresses.MARKETPLACE_FACTORY_ADDRESS || ''}`,
      `VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS=${addresses.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS || ''}`,
      `VITE_PUBSTARTER_CONTRACT_ADDRESS=${addresses.PUBSTARTER_ADDRESS || ''}`,
      // Use the Vite dev-server proxy URL so the browser avoids CORS issues.
      // Both the browser (via Vite proxy) and the Node.js test-runner reach the indexer this way.
      `VITE_GRAPHQL_URL=http://localhost:5173/graphql`,
      // IPFS gateway for client-side IPFS content fetching (project names, statement titles)
      `VITE_IPFS_GATEWAY=http://localhost:8080/ipfs`,
      // Hardhat RPC for on-chain reads (e.g. threshold/deadline from condition contracts)
      `VITE_ETH_RPC_URL=http://127.0.0.1:8545`,
    ];

    // Write back to ui/.env
    writeFileSync(uiEnvPath, newLines.join('\n'));

    console.log('   ✓ Contract addresses copied to ui/.env');
  } catch (error) {
    console.warn('   ⚠️  Failed to copy contract addresses:', error);
    console.warn('   Tests may fail if UI cannot access contract addresses');
  }
}

export default async function globalSetup() {
  console.log('🚀 Starting Docker Compose services for E2E tests...');

  // Get the project root directory (two levels up from e2e/)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = resolve(__dirname, '../..');

  try {
    // Clean up any existing containers and volumes to ensure fresh state
    console.log('🧹 Cleaning up existing containers...');
    try {
      execSync('docker-compose down -v', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch {
      // Ignore errors if containers don't exist
    }

    // Also clean Ponder sync state (bind mount persists across docker-compose down -v)
    // This is critical because even with PONDER_EPHEMERAL=true, Ponder stores sync state
    // in .ponder which causes it to try fetching blocks that don't exist on the fresh chain
    try {
      // Use docker run to clean up the directory (handles permission issues)
      execSync(`docker run --rm -v "${projectRoot}":/workspace alpine rm -rf /workspace/data/ponder`, { stdio: 'inherit' });
      console.log('   ✓ Cleared Ponder sync state');
    } catch {
      // Ignore if directory doesn't exist or can't be removed
    }

    // Start all services with build flag
    // Docker Compose will wait for healthchecks to pass due to depends_on configuration
    // PONDER_EPHEMERAL=true: use in-memory DB to avoid stale-state issues when the
    // Hardhat chain restarts fresh but the Ponder bind-mount has old block data.
    console.log('🔨 Building and starting services...');
    execSync('docker-compose up -d --build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, PONDER_EPHEMERAL: 'true' },
    });

    console.log('⏳ Waiting for services to become healthy...');

    // Wait for all services to be healthy
    // The indexer service is the last one to become healthy (it depends on all others)
    // so we just need to wait for it
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max wait
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const output = execSync('docker-compose ps --format json', {
          cwd: projectRoot,
          encoding: 'utf-8',
        });

        // Parse the JSON output (one JSON object per line)
        const lines = output.trim().split('\n').filter(line => line.trim());
        const services = lines.map(line => JSON.parse(line));

        // Check if indexer is healthy (it depends on all others, so if it's healthy, all are ready)
        const indexer = services.find(s => s.Service === 'indexer');

        if (indexer && indexer.Health === 'healthy') {
          console.log('✅ All services are healthy and ready!');
          console.log('   - Hardhat node: http://localhost:8545');
          console.log('   - IPFS API: http://localhost:5001');
          console.log('   - IPFS Gateway: http://localhost:8080');
          console.log('   - GraphQL Indexer: http://localhost:42069');

          // Copy contract addresses to UI .env file
          console.log('📝 Copying contract addresses to ui/.env...');
          copyContractAddresses(projectRoot);

          return;
        }

        // Log progress
        const healthStatuses = services.map(s => `${s.Service}: ${s.Health || s.State}`).join(', ');
        console.log(`   Attempt ${attempt + 1}/${maxAttempts}: ${healthStatuses}`);

      } catch {
        // Ignore errors during health check attempts
      }

      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempt++;
    }

    throw new Error('Services did not become healthy within the timeout period');

  } catch (error) {
    console.error('❌ Failed to start Docker services:', error);

    // Try to show docker-compose logs for debugging
    console.error('\n📋 Docker Compose logs:');
    try {
      execSync('docker-compose logs --tail=50', {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch {
      // Ignore if logs command fails
    }

    throw error;
  }
}
