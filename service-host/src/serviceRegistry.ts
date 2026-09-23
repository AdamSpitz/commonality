import type { ServiceKind } from './config.js';
import {
  conceptspaceServiceAppFactories,
  conceptspaceServiceFactories,
  type ServiceAppFactory,
} from './conceptspaceServiceRegistry.js';
import {
  fundingServiceAppFactories,
  fundingServiceFactories,
} from './fundingServiceRegistry.js';
import type { ServiceFactory } from './serviceTypes.js';

export type { ServiceFactory, ServiceRunHandle } from './serviceTypes.js';
export type { ServiceAppFactory } from './conceptspaceServiceRegistry.js';
export {
  conceptspaceServiceAppFactories,
  conceptspaceServiceFactories,
} from './conceptspaceServiceRegistry.js';

/** Full host: Conceptspace services plus funding consumers. Conceptspace-only entry is conceptspaceServiceFactories. */
export const serviceFactories: Record<ServiceKind, ServiceFactory> = {
  ...conceptspaceServiceFactories,
  ...fundingServiceFactories,
};

export const serviceAppFactories: Partial<Record<ServiceKind, ServiceAppFactory>> = {
  ...conceptspaceServiceAppFactories,
  ...fundingServiceAppFactories,
};
