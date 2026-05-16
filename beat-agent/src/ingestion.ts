import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export type BeatSourceType = 'account' | 'query' | 'list' | 'rss';

export interface BeatDefinition {
  beatId: string;
  sources: BeatSource[];
}

export interface BeatSource {
  id: string;
  type: BeatSourceType;
  locator: string;
  platform?: string;
  minPollIntervalMs?: number;
  credentialEnvVar?: string;
}

export interface BeatIngestedItem {
  contentCanonicalId: string;
  sourceId: string;
  platform?: string;
  contentUrl?: string;
  authorHandle?: string;
  authorId?: string;
  text: string;
  observedAt: string;
  ingestedAt: string;
  raw?: unknown;
}

export interface BeatIngestionState {
  schemaVersion: 1;
  items: BeatIngestedItem[];
  sourceCursors: Record<string, BeatSourceCursor>;
}

export interface BeatSourceCursor {
  lastFetchedAt: string;
  cursor?: string;
}

export interface BeatSourceFetchResult {
  items: BeatIngestedItem[];
  cursor?: string;
}

export interface BeatSourceAdapter {
  fetchSource: (source: BeatSource, cursor: BeatSourceCursor | undefined) => Promise<BeatSourceFetchResult>;
}

export interface RunBeatIngestionOnceParams {
  definition: BeatDefinition;
  stateFilePath: string;
  adapters: Partial<Record<BeatSourceType, BeatSourceAdapter>>;
  now?: Date;
  env?: Record<string, string | undefined>;
}

export interface BeatIngestionRunSummary {
  fetchedSourceIds: string[];
  skippedSources: BeatIngestionSkippedSource[];
  newItemCount: number;
  duplicateItemCount: number;
}

export interface BeatIngestionSkippedSource {
  sourceId: string;
  reason: 'rate_limited' | 'missing_credentials' | 'missing_adapter' | 'fetch_failed';
  errorMessage?: string;
  errorName?: string;
}

const emptyState: BeatIngestionState = {
  schemaVersion: 1,
  items: [],
  sourceCursors: {},
};

export async function loadBeatIngestionState(filePath: string): Promise<BeatIngestionState> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BeatIngestionState>;
    return {
      schemaVersion: 1,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      sourceCursors: parsed.sourceCursors ?? {},
    };
  } catch {
    return { ...emptyState, items: [], sourceCursors: {} };
  }
}

export async function saveBeatIngestionState(
  filePath: string,
  state: BeatIngestionState,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

export async function runBeatIngestionOnce(
  params: RunBeatIngestionOnceParams,
): Promise<BeatIngestionRunSummary> {
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();
  const env = params.env ?? process.env;
  const state = await loadBeatIngestionState(params.stateFilePath);
  const knownIds = new Set(state.items.map((item) => item.contentCanonicalId));
  const summary: BeatIngestionRunSummary = {
    fetchedSourceIds: [],
    skippedSources: [],
    newItemCount: 0,
    duplicateItemCount: 0,
  };

  for (const source of params.definition.sources) {
    const previousCursor = state.sourceCursors[source.id];
    const skipReason = getSourceSkipReason(source, previousCursor, now, env, params.adapters);
    if (skipReason) {
      summary.skippedSources.push({ sourceId: source.id, reason: skipReason });
      continue;
    }

    const adapter = params.adapters[source.type];
    if (!adapter) {
      // getSourceSkipReason already checks this; keep TypeScript honest.
      summary.skippedSources.push({ sourceId: source.id, reason: 'missing_adapter' });
      continue;
    }

    let result: BeatSourceFetchResult;
    try {
      result = await adapter.fetchSource(source, previousCursor);
    } catch (error) {
      summary.skippedSources.push({
        sourceId: source.id,
        reason: 'fetch_failed',
        ...getFetchErrorMetadata(error),
      });
      continue;
    }
    summary.fetchedSourceIds.push(source.id);

    for (const item of result.items) {
      if (knownIds.has(item.contentCanonicalId)) {
        summary.duplicateItemCount += 1;
        continue;
      }

      knownIds.add(item.contentCanonicalId);
      state.items.push({
        ...item,
        sourceId: item.sourceId || source.id,
        platform: item.platform ?? source.platform,
        ingestedAt: item.ingestedAt || nowIso,
      });
      summary.newItemCount += 1;
    }

    state.sourceCursors[source.id] = {
      lastFetchedAt: nowIso,
      cursor: result.cursor ?? previousCursor?.cursor,
    };
  }

  await saveBeatIngestionState(params.stateFilePath, state);
  return summary;
}

function getSourceSkipReason(
  source: BeatSource,
  cursor: BeatSourceCursor | undefined,
  now: Date,
  env: Record<string, string | undefined>,
  adapters: Partial<Record<BeatSourceType, BeatSourceAdapter>>,
): BeatIngestionSkippedSource['reason'] | null {
  if (!adapters[source.type]) {
    return 'missing_adapter';
  }

  if (source.credentialEnvVar && !env[source.credentialEnvVar]) {
    return 'missing_credentials';
  }

  if (cursor && source.minPollIntervalMs !== undefined) {
    const lastFetchedAt = Date.parse(cursor.lastFetchedAt);
    if (!Number.isNaN(lastFetchedAt) && now.getTime() - lastFetchedAt < source.minPollIntervalMs) {
      return 'rate_limited';
    }
  }

  return null;
}

function getFetchErrorMetadata(error: unknown): Pick<BeatIngestionSkippedSource, 'errorMessage' | 'errorName'> {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
    };
  }

  if (typeof error === 'string') {
    return { errorMessage: error };
  }

  return { errorMessage: 'Unknown source fetch failure' };
}
