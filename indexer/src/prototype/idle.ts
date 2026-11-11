import { requestWakesIndexer } from "../rpc/idleHeadCache";

/** Health, status, and removed Ponder routes must not open the fast window. */
export function prototypeRequestOpensFastPoll(method: string, path: string): boolean {
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

  /**
   * Idle sleeps are interruptible so a reader does not wait out the idle gap.
   * The fast-poll interval must not be: a reader every few seconds was
   * aborting the 12s sleep and burning the daily CU ceiling.
   */
  wait(ms: number, options?: { interruptible?: boolean }): Promise<void> {
    const interruptible = options?.interruptible !== false;
    return new Promise(resolve => {
      const done = () => {
        clearTimeout(timer);
        this.waiters = this.waiters.filter(waiter => waiter !== done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      if (interruptible) this.waiters.push(done);
    });
  }
}
