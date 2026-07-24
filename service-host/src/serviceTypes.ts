import type { HostedServiceConfig } from './config.js';

export interface ServiceRunHandle {
  stop: () => Promise<void>;
  finished?: Promise<void>;
}

export type ServiceFactory = (service: HostedServiceConfig) => ServiceRunHandle;
