import { mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BeatMemoryConfig } from "./config.js";
import type { BeatSource } from "./ingestion.js";

interface SpendFile {
	spendPeriod?: string;
	reservedUsd?: number;
	settledUsd?: number;
	readReservedBySource?: Record<string, number>;
}

const reservations = new Map<string, number>();

function lockPath(filePath: string): string {
	return `${filePath}.lock`;
}

async function withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
	const path = lockPath(filePath);
	await mkdir(dirname(filePath), { recursive: true });
	const started = Date.now();
	for (;;) {
		try {
			const handle = await open(path, "wx");
			try {
				return await fn();
			} finally {
				await handle.close();
				await unlink(path).catch(() => undefined);
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST" || Date.now() - started > 5000) {
				throw error;
			}
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
	}
}

async function readSpend(filePath: string): Promise<SpendFile> {
	try {
		return JSON.parse(await readFile(filePath, "utf8")) as SpendFile;
	} catch {
		return {};
	}
}

async function writeSpend(filePath: string, state: SpendFile): Promise<void> {
	const existing = await readSpend(filePath);
	await writeFile(filePath, JSON.stringify({ ...existing, ...state }, null, 2));
}

function periodOf(now: Date): string {
	return now.toISOString().slice(0, 7);
}

export async function reserveSourceRead(
	config: BeatMemoryConfig,
	source: BeatSource,
	now: Date,
	maxReadItems = 1,
): Promise<boolean> {
	const filePath = config.spendStateFilePath;
	const ceiling = config.monthlySpendCeilingUsd;
	if (!filePath || ceiling === undefined) return true;
	// Reserve the whole bounded response before a paid call, including expanded posts.
	const reserve = maxReadItems * config.estimatedReadUsdPerPost;
	if (reserve === 0) return true;
	return withLock(filePath, async () => {
		const state = await readSpend(filePath);
		const period = periodOf(now);
		const settled = state.spendPeriod === period ? state.settledUsd ?? 0 : 0;
		const reserved = state.spendPeriod === period ? state.reservedUsd ?? 0 : 0;
		if (settled + reserved + reserve > ceiling) return false;
		await writeSpend(filePath, {
			spendPeriod: period,
			settledUsd: settled,
			reservedUsd: reserved + reserve,
			readReservedBySource: { ...(state.readReservedBySource ?? {}), [source.id]: reserve },
		});
		reservations.set(source.id, reserve);
		return true;
	});
}

export async function settleSourceRead(
	config: BeatMemoryConfig,
	source: BeatSource,
	itemCount: number,
	now: Date,
): Promise<void> {
	const filePath = config.spendStateFilePath;
	if (!filePath) return;
	const reserved = reservations.get(source.id) ?? 0;
	reservations.delete(source.id);
	const actual = itemCount * config.estimatedReadUsdPerPost;
	await withLock(filePath, async () => {
		const state = await readSpend(filePath);
		const period = periodOf(now);
		const settled = state.spendPeriod === period ? state.settledUsd ?? 0 : 0;
		const inFlight = state.spendPeriod === period ? state.reservedUsd ?? 0 : 0;
		const bySource = { ...(state.readReservedBySource ?? {}) };
		delete bySource[source.id];
		await writeSpend(filePath, {
			spendPeriod: period,
			settledUsd: settled + actual,
			reservedUsd: Math.max(0, inFlight - reserved),
			readReservedBySource: bySource,
		});
	});
}
