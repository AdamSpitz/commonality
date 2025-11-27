/**
 * Wrapper script to run integration tests from the hardhat context
 * This ensures that 'hardhat' module can be resolved correctly
 */

// Import and run the scenario tests
import('./integration-test-scenarios.js').then(async (module) => {
  const { ScenarioTests } = module;
  const tests = new ScenarioTests();
  const exitCode = await tests.runAllScenarios();
  process.exit(exitCode);
}).catch((error) => {
  console.error('Failed to run integration tests:', error);
  process.exit(1);
});
