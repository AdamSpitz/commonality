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
      'MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
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

    // Remove any existing contract address lines from ui/.env
    const existingLines = uiEnv.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return !addressesToCopy.some(key => trimmedLine.startsWith(`VITE_${key}=`));
    });

    // Add contract addresses as VITE_ prefixed env vars
    const newLines = [
      ...existingLines,
      '',
      '# Contract addresses (auto-populated by E2E test setup)',
      `VITE_BELIEFS_CONTRACT_ADDRESS=${addresses.BELIEFS_CONTRACT_ADDRESS || ''}`,
      `VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS=${addresses.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS || ''}`,
      `VITE_GRAPHQL_URL=http://localhost:42069/graphql`,
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

    // Start all services with build flag
    // Docker Compose will wait for healthchecks to pass due to depends_on configuration
    console.log('🔨 Building and starting services...');
    execSync('docker-compose up -d --build', {
      cwd: projectRoot,
      stdio: 'inherit',
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

      } catch (error) {
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
