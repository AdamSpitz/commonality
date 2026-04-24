import type { ContentAttesterConfig } from '@commonality/content-attester';
import type { AttesterConfig } from '@commonality/implication-attester';
export interface HostedAttesterDefinition<TConfig> {
    routePrefix: string;
    config: TConfig;
}
export interface AttesterHostConfig {
    port: number;
    implicationAttester: HostedAttesterDefinition<AttesterConfig>;
    contentAttester: HostedAttesterDefinition<ContentAttesterConfig>;
}
export declare function parseAttesterHostConfig(value: unknown): AttesterHostConfig;
export declare function loadAttesterHostConfig(configPath: string): Promise<AttesterHostConfig>;
export declare function getAttesterHostConfigPath(argv: string[], env?: NodeJS.ProcessEnv): string;
//# sourceMappingURL=config.d.ts.map