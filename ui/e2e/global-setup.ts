import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { request } from 'http';

/**
 * Global setup for Playwright E2E tests
 *
 * This script runs before all tests to start the Docker Compose services
 * (hardhat-node, ipfs, indexer, platform-api-service) so that E2E tests can
 * interact with a real backend stack.
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
      'TRUST_REGISTRY_ADDRESS',
      'PROJECT_FACTORY_ADDRESS',
      'PAYMENT_TOKEN_ADDRESS',
      'CONTENT_REGISTRY_ADDRESS',
      'CHANNEL_REGISTRY_ADDRESS',
      'CHANNEL_VERIFIER_ADDRESS',
      'CHANNEL_ESCROW_ADDRESS',
      'CREATOR_CONTRACT_FACTORY_ADDRESS',
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
      'VITE_PLATFORM_API_URL=',
      'VITE_DISABLE_EXTERNAL_EMBEDS=',
      'VITE_E2E=',
      'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS=',
      'VITE_NOTE_INTENT_CONTRACT_ADDRESS=',
      'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS=',
      'VITE_ERC1155_FACTORY_ADDRESS=',
      'VITE_MARKETPLACE_FACTORY_ADDRESS=',
      'VITE_IMPLICATIONS_CONTRACT_ADDRESS=',
      'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS=',
      'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS=',
      'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS=',
      'VITE_CONTENT_REGISTRY_ADDRESS=',
      'VITE_CHANNEL_REGISTRY_ADDRESS=',
      'VITE_CHANNEL_VERIFIER_ADDRESS=',
      'VITE_CHANNEL_ESCROW_ADDRESS=',
      'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS=',
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
      `VITE_TRUST_REGISTRY_CONTRACT_ADDRESS=${addresses.TRUST_REGISTRY_ADDRESS || ''}`,
      `VITE_PROJECT_FACTORY_CONTRACT_ADDRESS=${addresses.PROJECT_FACTORY_ADDRESS || ''}`,
      `VITE_PAYMENT_TOKEN_ADDRESS=${addresses.PAYMENT_TOKEN_ADDRESS || ''}`,
      `VITE_CONTENT_REGISTRY_ADDRESS=${addresses.CONTENT_REGISTRY_ADDRESS || ''}`,
      `VITE_CHANNEL_REGISTRY_ADDRESS=${addresses.CHANNEL_REGISTRY_ADDRESS || ''}`,
      `VITE_CHANNEL_VERIFIER_ADDRESS=${addresses.CHANNEL_VERIFIER_ADDRESS || ''}`,
      `VITE_CHANNEL_ESCROW_ADDRESS=${addresses.CHANNEL_ESCROW_ADDRESS || ''}`,
      `VITE_CREATOR_CONTRACT_FACTORY_ADDRESS=${addresses.CREATOR_CONTRACT_FACTORY_ADDRESS || ''}`,
      // Use the Vite dev-server proxy URL so the browser avoids CORS issues.
      // Both the browser (via Vite proxy) and the Node.js test-runner reach the indexer this way.
      `VITE_GRAPHQL_URL=http://localhost:5173/graphql`,
      // IPFS gateway for client-side IPFS content fetching (project names, statement titles)
      `VITE_IPFS_GATEWAY=http://localhost:8080/ipfs`,
      // Hardhat RPC for on-chain reads (e.g. threshold/deadline from condition contracts)
      `VITE_ETH_RPC_URL=http://127.0.0.1:8545`,
      `VITE_PLATFORM_API_URL=http://localhost:3001`,
      `COMMONALITY_ENVIRONMENT=local`,
      // E2E data uses synthetic social-content IDs; avoid hitting real platform
      // providers for those fake channels/URLs, which produces browser-console
      // 404s unrelated to the UI flow under test.
      `VITE_ENABLE_CHANNEL_METADATA_LOOKUP=false`,
      `VITE_DISABLE_EXTERNAL_EMBEDS=true`,
      // Keep E2E browser wallet setup mock-only. ConnectKit's default connector
      // set pulls in third-party wallet SDKs (for example Coinbase) that perform
      // unrelated browser environment probes and can emit noisy console errors.
      `VITE_E2E=true`,
    ];

    // Write back to ui/.env
    writeFileSync(uiEnvPath, newLines.join('\n'));

    console.log('   ✓ Contract addresses copied to ui/.env');
  } catch (error) {
    console.warn('   ⚠️  Failed to copy contract addresses:', error);
    console.warn('   Tests may fail if UI cannot access contract addresses');
  }
}

async function waitForHttp(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  let lastError: unknown = null;

  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolvePromise, reject) => {
        const req = request(url, { method: 'GET', timeout: 2_000 }, res => {
          res.resume();
          resolvePromise();
        });
        req.on('timeout', () => {
          req.destroy(new Error(`Timed out waiting for ${url}`));
        });
        req.on('error', reject);
        req.end();
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function waitForViteServers(): Promise<void> {
  console.log('⏳ Waiting for Vite dev servers after E2E env refresh...');
  await Promise.all([
    waitForHttp('http://localhost:5173/'),
    waitForHttp('http://localhost:5174/'),
    waitForHttp('http://localhost:5175/'),
  ]);
  console.log('   ✓ Vite dev servers are reachable');
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

    // Also clean bind-mounted chain/indexer state (bind mounts persist across docker-compose down -v)
    // Hardhat state must be cleared so contract-code changes get redeployed instead of reusing
    // stale persisted deployments at deterministic addresses.
    // This is critical because even with PONDER_EPHEMERAL=true, Ponder stores sync state
    // in .ponder which causes it to try fetching blocks that don't exist on the fresh chain
    try {
      // Use docker run to clean up the directory (handles permission issues)
      execSync(`docker run --rm -v "${projectRoot}":/workspace alpine rm -rf /workspace/data/hardhat /workspace/data/ponder`, { stdio: 'inherit' });
      console.log('   ✓ Cleared Hardhat and Ponder state');
    } catch {
      // Ignore if directory doesn't exist or can't be removed
    }

    // Pre-create bind-mounted data directories as the host user so Docker
    // does not recreate them as root-owned directories.
    for (const directory of ['hardhat', 'ipfs', 'ponder']) {
      mkdirSync(resolve(projectRoot, 'data', directory), { recursive: true });
    }

    // Start only the backend services with build flag.
    // Playwright's webServer config starts the Vite UI locally, so the docker-compose
    // ui service would just race for port 5173 and fail.
    // Docker Compose will wait for healthchecks to pass due to depends_on configuration
    // PONDER_EPHEMERAL=true: use in-memory DB to avoid stale-state issues when the
    // Hardhat chain restarts fresh but the Ponder bind-mount has old block data.
    const servicesToStart = ['hardhat-node', 'hardhat-deploy', 'ipfs', 'indexer', 'platform-api-service'];
    console.log('🔨 Building and starting services...');
    execSync(`docker-compose up -d --build ${servicesToStart.join(' ')}`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        PONDER_EPHEMERAL: 'true',
        // The repository .env may be configured for deployed/testnet origins.
        // E2E Vite servers run on localhost ports, so force permissive local
        // CORS for the throwaway Docker platform API started by this setup.
        CORS_ALLOWED_ORIGINS: '*',
      },
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

        // Check if indexer is healthy (it depends on hardhat/ipfs/deploy) and
        // platform API is healthy so browser API calls do not produce console errors.
        const indexer = services.find(s => s.Service === 'indexer');
        const platformApi = services.find(s => s.Service === 'platform-api-service');

        if (indexer?.Health === 'healthy' && platformApi?.Health === 'healthy') {
          console.log('✅ All services are healthy and ready!');
          console.log('   - Hardhat node: http://localhost:8545');
          console.log('   - IPFS API: http://localhost:5001');
          console.log('   - IPFS Gateway: http://localhost:8080');
          console.log('   - GraphQL Indexer: http://localhost:42069');
          console.log('   - Platform API: http://localhost:3001');

          // Copy contract addresses to UI .env file
          console.log('📝 Copying contract addresses to ui/.env...');
          copyContractAddresses(projectRoot);
          await waitForViteServers();

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
