import { type Server } from 'node:http';
import { type Express } from 'express';
import { type ContentAttesterConfig } from '@commonality/content-attester';
import { type AttesterConfig } from '@commonality/implication-attester';
import { type AttesterHostConfig } from './config.js';
export interface AttesterHostAppFactories {
    createImplicationApp?: (config: AttesterConfig) => Express;
    createContentApp?: (config: ContentAttesterConfig) => Express;
}
export interface AttesterHostRunHandle {
    server: Server;
    stop: () => Promise<void>;
}
export declare function createAttesterHostApp(config: AttesterHostConfig, factories?: AttesterHostAppFactories): Express;
export declare function run(config: AttesterHostConfig): AttesterHostRunHandle;
//# sourceMappingURL=index.d.ts.map