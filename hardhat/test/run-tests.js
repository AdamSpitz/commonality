// Simple test runner that compiles and runs the Solidity test contract

async function main() {
  console.log("DelegatableNotes Test Results");
  console.log("============================\n");

  const hre = await import("hardhat");

  // Deploy the test contract
  const TestContract = await hre.ethers.getContractFactory("DelegatableNotesTest");
  const test = await TestContract.deploy({ value: hre.ethers.parseEther("10") });
  await test.waitForDeployment();

  console.log("Test contract deployed to:", await test.getAddress());

  // Run all tests
  const tx = await test.runAllTests({ value: hre.ethers.parseEther("5") });
  const receipt = await tx.wait();

  console.log("\nTest execution completed!");
  console.log("Gas used:", receipt.gasUsed.toString());

  // Parse events to see test results
  const iface = test.interface;
  let passedTests = 0;
  let failedTests = 0;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "TestResult") {
        const [message, success] = parsed.args;
        console.log(`${success ? "✓" : "✗"} ${message}`);
        if (success) passedTests++;
        else failedTests++;
      }
    } catch (e) {
      // Not a TestResult event
    }
  }

  console.log(`\n${passedTests} passed, ${failedTests} failed`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
