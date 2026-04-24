export interface PollingFinderRunHandle {
  finished: Promise<void>;
  stop: () => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function runPollingFinder(params: {
  serviceName: string;
  pollIntervalMs: number;
  runOnce: () => Promise<void>;
}): PollingFinderRunHandle {
  const { serviceName, pollIntervalMs, runOnce } = params;
  let stopped = false;
  let stopRequested = false;

  const finished = (async () => {
    console.log(`${serviceName} starting.`);
    console.log(`  Poll interval: ${pollIntervalMs}ms`);

    while (!stopRequested) {
      try {
        await runOnce();
      } catch (error) {
        console.error(`Error in ${serviceName} poll cycle:`, error);
      }

      if (stopRequested) {
        break;
      }

      await sleep(pollIntervalMs);
    }

    stopped = true;
  })();

  return {
    finished,
    stop: async () => {
      if (stopped) {
        await finished;
        return;
      }

      stopRequested = true;
      await finished;
    },
  };
}
