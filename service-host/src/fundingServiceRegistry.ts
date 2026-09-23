import {
  createBeatAgentApp,
  run as runBeatAgent,
} from '@commonality/beat-agent';
import { run as runContentFinder } from '@commonality/content-finder';
import { createContentAttesterApp, run as runContentAttester } from '@commonality/content-attester';
import type { FundingServiceKind } from './config.js';
import { runRecurringPledgeScheduler } from './recurringPledgeScheduler.js';
import type { ServiceFactory } from './serviceTypes.js';
import type { ServiceAppFactory } from './conceptspaceServiceRegistry.js';

export const fundingServiceFactories: Record<FundingServiceKind, ServiceFactory> = {
  'content-finder': (worker) => runContentFinder(
    worker.config as unknown as Parameters<typeof runContentFinder>[0],
  ),
  'content-attester': (worker) => runContentAttester(
    worker.config as unknown as Parameters<typeof runContentAttester>[0],
  ),
  'beat-agent': (worker) => runBeatAgent(
    worker.config as unknown as Parameters<typeof runBeatAgent>[0],
  ),
  'recurring-pledge-scheduler': (worker) => runRecurringPledgeScheduler(
    worker.config as unknown as Parameters<typeof runRecurringPledgeScheduler>[0],
  ),
};

export const fundingServiceAppFactories: Partial<Record<FundingServiceKind, ServiceAppFactory>> = {
  'content-attester': (config) => createContentAttesterApp(
    config as unknown as Parameters<typeof createContentAttesterApp>[0],
  ),
  'beat-agent': (config) => createBeatAgentApp(
    config as unknown as Parameters<typeof createBeatAgentApp>[0],
  ),
};
