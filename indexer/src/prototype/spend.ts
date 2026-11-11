/**
 * Hourly and daily CU/request ceilings. A retry storm parks the sync loop
 * instead of draining a freshly raised provider cap. Hardhat stays ungated
 * unless INDEXER_SPEND_GUARD=1.
 *
 * Weights match Alchemy's published table (checked 2026-11-09): block header
 * 20 CU, eth_getLogs 60 CU. Unknown methods count as 20 so a new call cannot
 * slip past the ceiling.
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

const WEIGHTS: Record<string, number> = {
  eth_chainId: 0,
  eth_getBlockByNumber: 20,
  eth_getLogs: 60,
};

export function cuFor(method: string): number {
  return WEIGHTS[method] ?? 20;
}

export type SpendLimits = {
  hourlyCu: number;
  dailyCu: number;
  hourlyRequests: number;
  dailyRequests: number;
  /** Extra process-lifetime allowance used only while the loop is still behind. 0 disables it. */
  catchupRequests: number;
  catchupCu: number;
};

export type ParkedSync = { reason: string; until: string } | undefined;

export class SpendParked extends Error {
  constructor(message: string, readonly untilMs: number, readonly reason: string) {
    super(message);
  }
}

function positive(value: string | undefined, fallback: number, name: string): number {
  const raw = value ?? String(fallback);
  if (!/^\d+$/.test(raw) || Number(raw) < 1) throw new Error(`Invalid ${name}`);
  return Number(raw);
}

/** Null means the guard is off (local Hardhat, or INDEXER_SPEND_GUARD=0). */
export function spendLimitsFromEnv(env: NodeJS.ProcessEnv): SpendLimits | null {
  if (env.INDEXER_SPEND_GUARD === "0") return null;
  const hardhat = (env.PONDER_CHAIN ?? "hardhat") === "hardhat";
  if (hardhat && env.INDEXER_SPEND_GUARD !== "1") return null;
  const catchup = env.INDEXER_CATCHUP === "1";
  return {
    hourlyCu: positive(env.INDEXER_HOURLY_CU, 100_000, "INDEXER_HOURLY_CU"),
    dailyCu: positive(env.INDEXER_DAILY_CU, 1_000_000, "INDEXER_DAILY_CU"),
    hourlyRequests: positive(env.INDEXER_HOURLY_REQUESTS, 2_000, "INDEXER_HOURLY_REQUESTS"),
    dailyRequests: positive(env.INDEXER_DAILY_REQUESTS, 40_000, "INDEXER_DAILY_REQUESTS"),
    catchupRequests: catchup ? positive(env.INDEXER_CATCHUP_REQUESTS, 10_000, "INDEXER_CATCHUP_REQUESTS") : 0,
    catchupCu: catchup ? positive(env.INDEXER_CATCHUP_CU, 500_000, "INDEXER_CATCHUP_CU") : 0,
  };
}

type Tick = { at: number; cu: number; catchup: boolean };

export class SpendLedger {
  private ticks: Tick[] = [];
  private catchupRequestsUsed = 0;
  private catchupCuUsed = 0;
  parkedUntil = 0;
  reason = "";
  catchingUp = false;

  readonly limits: SpendLimits;

  constructor(limits: Omit<SpendLimits, "catchupRequests" | "catchupCu"> & Partial<Pick<SpendLimits, "catchupRequests" | "catchupCu">>, private now: () => number = Date.now) {
    this.limits = { catchupRequests: 0, catchupCu: 0, ...limits };
  }

  /** While true, calls draw the extra catch-up allowance instead of the quiet hourly ceiling. */
  setCatchingUp(on: boolean): void {
    this.catchingUp = on && this.limits.catchupRequests > 0 && this.limits.catchupCu > 0;
  }

  parked(at = this.now()): boolean {
    return at < this.parkedUntil;
  }

  /** Reserve one RPC attempt. Throws SpendParked without recording it. */
  admit(method: string, at = this.now()): void {
    if (this.parked(at)) {
      throw new SpendParked("Indexer spend guard is parked", this.parkedUntil, this.reason);
    }
    const cu = cuFor(method);
    const catchup = this.catchupCanCover(cu);
    const hourly = this.ticks.filter(tick => !tick.catchup && tick.at > at - HOUR_MS);
    const daily = this.ticks.filter(tick => !tick.catchup && tick.at > at - DAY_MS);
    const hourlyCu = hourly.reduce((sum, tick) => sum + tick.cu, 0);
    const dailyCu = daily.reduce((sum, tick) => sum + tick.cu, 0);
    const breaches: string[] = [];
    if (!catchup && hourly.length + 1 > this.limits.hourlyRequests) breaches.push("hourly requests");
    if (!catchup && daily.length + 1 > this.limits.dailyRequests) breaches.push("daily requests");
    if (!catchup && hourlyCu + cu > this.limits.hourlyCu) breaches.push("hourly CU");
    if (!catchup && dailyCu + cu > this.limits.dailyCu) breaches.push("daily CU");
    if (breaches.length) {
      this.reason = breaches.join(", ");
      this.parkedUntil = at + this.waitFor(at, cu, catchup);
      throw new SpendParked(`Indexer spend guard parked (${this.reason})`, this.parkedUntil, this.reason);
    }
    this.ticks = daily;
    this.ticks.push({ at, cu, catchup });
    if (catchup) {
      this.catchupRequestsUsed += 1;
      this.catchupCuUsed += cu;
    }
  }

  private catchupCanCover(cu: number): boolean {
    return this.catchingUp
      && this.catchupRequestsUsed + 1 <= this.limits.catchupRequests
      && this.catchupCuUsed + cu <= this.limits.catchupCu;
  }

  private waitFor(at: number, cu: number, catchup: boolean): number {
    if (catchup) return 1;
    if (cu > this.limits.dailyCu || 1 > this.limits.dailyRequests) return DAY_MS;
    const needDay = this.ticks.filter(tick => !tick.catchup && tick.at > at - DAY_MS);
    const dayWait = needDay.length ? needDay[0]!.at + DAY_MS - at : DAY_MS;
    const dailyCu = needDay.reduce((sum, tick) => sum + tick.cu, 0);
    if (needDay.length + 1 > this.limits.dailyRequests || dailyCu + cu > this.limits.dailyCu) return Math.max(dayWait, 1);
    if (cu > this.limits.hourlyCu || 1 > this.limits.hourlyRequests) return HOUR_MS;
    const needHour = this.ticks.filter(tick => !tick.catchup && tick.at > at - HOUR_MS);
    const hourWait = needHour.length ? needHour[0]!.at + HOUR_MS - at : HOUR_MS;
    const hourlyCu = needHour.reduce((sum, tick) => sum + tick.cu, 0);
    if (needHour.length + 1 > this.limits.hourlyRequests || hourlyCu + cu > this.limits.hourlyCu) return Math.max(hourWait, 1);
    return Math.max(dayWait, 1);
  }
}
