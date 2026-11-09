import { requestWakesIndexer } from "../rpc/idleHeadCache";

/** Prototype GraphQL is only a liveness probe, so it must not open the fast window. */
export function prototypeRequestOpensFastPoll(method: string, path: string): boolean {
  const normalized = path.split("?")[0] ?? path;
  if (normalized === "/graphql" || normalized.startsWith("/graphql/") || normalized === "/sql" || normalized.startsWith("/sql/")) {
    return false;
  }
  return requestWakesIndexer(method, path);
}

/** Skip log work while idle; a reader or POST /api/indexer-wake opens a fast-poll window. */
export class PrototypeIdleGate {
  private fastUntil = 0;
  private waiters: Array<() => void> = [];

  constructor(
    readonly idleIntervalMs: number,
    readonly wakeMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  note(method: string, path: string): void {
    if (!prototypeRequestOpensFastPoll(method, path)) return;
    this.fastUntil = this.now() + this.wakeMs;
    const waiters = this.waiters;
    this.waiters = [];
    for (const wake of waiters) wake();
  }

  fast(): boolean {
    return this.now() < this.fastUntil;
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      const done = () => {
        clearTimeout(timer);
        this.waiters = this.waiters.filter(waiter => waiter !== done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.waiters.push(done);
    });
  }
}
