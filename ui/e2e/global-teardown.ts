import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Global teardown for Playwright E2E tests
 *
 * This script runs after all tests complete to clean up the Docker Compose
 * services. It stops all containers and removes volumes to ensure a fresh
 * state for the next test run.
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up Docker Compose services...');

  // Get the project root directory (two levels up from e2e/)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = resolve(__dirname, '../..');

  try {
    execSync('docker-compose down -v', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log('✅ Docker services cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to clean up Docker services:', error);
    // Don't throw - we still want tests to report their results even if cleanup fails
  }
}
