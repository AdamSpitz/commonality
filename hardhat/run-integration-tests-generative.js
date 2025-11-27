/**
 * Wrapper script to run generative integration tests from the hardhat context
 * This ensures that 'hardhat' module can be resolved correctly
 */

// Import and run the generative tests
import('./integration-test-generative.js').then(async (module) => {
  const { IndexerTestRunner } = module;
  const testRunner = new IndexerTestRunner();
  const exitCode = await testRunner.run();
  process.exit(exitCode);
}).catch((error) => {
  console.error('Failed to run integration tests:', error);
  process.exit(1);
});
