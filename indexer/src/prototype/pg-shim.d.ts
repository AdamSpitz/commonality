declare module "pg" {
  export class Pool {
    constructor(config: { connectionString: string; max?: number });
    query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    connect(): Promise<{ query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; release(): void }>;
    end(): Promise<void>;
  }
}
