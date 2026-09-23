import type { ServiceHostConfig } from './config.js';
import { serviceAppFactories, serviceFactories } from './serviceRegistry.js';
import {
  createServiceHostApp as createRuntimeApp,
  run as runRuntime,
  type ServiceHostAppFactories,
  type ServiceHostRunHandle,
} from './hostRuntime.js';

export type { ServiceHostAppFactories, ServiceHostRunHandle };

/** Combined host. A Conceptspace-only process uses hostRuntime with conceptspace factories. */
export function createServiceHostApp(
  config: ServiceHostConfig,
  factories: Partial<ServiceHostAppFactories> = {},
) {
  return createRuntimeApp(config, {
    serviceAppFactories: factories.serviceAppFactories ?? serviceAppFactories,
  });
}

export function run(config: ServiceHostConfig): ServiceHostRunHandle {
  return runRuntime(config, {
    factories: serviceFactories,
    serviceAppFactories,
  });
}
