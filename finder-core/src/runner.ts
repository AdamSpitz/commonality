function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runPollingFinder(params: {
  serviceName: string;
  pollIntervalMs: number;
  runOnce: () => Promise<void>;
}): Promise<never> {
  const { serviceName, pollIntervalMs, runOnce } = params;

  console.log(`${serviceName} starting.`);
  console.log(`  Poll interval: ${pollIntervalMs}ms`);

  while (true) {
    try {
      await runOnce();
    } catch (error) {
      console.error(`Error in ${serviceName} poll cycle:`, error);
    }

    await sleep(pollIntervalMs);
  }
}
