import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  POLICY_BUNDLE_SCHEMA,
  parseResolvedPolicyBundle,
  resolvedPolicyBundleDigest,
  type ResolvedPolicyArtifact,
  type ResolvedPolicyBundle,
  type ResolvedPolicyLayer,
} from './bundles.js';
import { parseLocalPolicyListDocument } from './documents.js';
import { assertPolicyArtifactEntryLimit, fetchPolicyArtifact, type PolicyArtifactFetchOptions } from './fetch-node.js';
import { canonicalJsonBytes, canonicalJsonSha256, canonicalizeJson, parseStrictJson, type JsonValue } from './json.js';
import { parsePolicyRootDocument, type LocalPolicyListRef, type PolicyRootDocument } from './roots.js';

export {
  fetchPolicyArtifact,
  PolicyArtifactFetchError,
  type PolicyArtifactFetchLimits,
  type PolicyArtifactFetchOptions,
} from './fetch-node.js';

export class LocalPolicyResolverError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LocalPolicyResolverError';
  }
}

async function readRoot(path: string): Promise<PolicyRootDocument> {
  try {
    return parsePolicyRootDocument(parseStrictJson(await readFile(path)));
  } catch (error) {
    throw new LocalPolicyResolverError(`Cannot read policy root ${path}`, { cause: error });
  }
}

function localSourcePath(source: string, rootDirectory: string): string {
  const value = source.slice('file:'.length);
  return resolve(rootDirectory, value);
}

async function resolveArtifact(ref: LocalPolicyListRef, rootDirectory: string, fetchOptions?: PolicyArtifactFetchOptions): Promise<ResolvedPolicyArtifact> {
  if (ref.source.startsWith('https:') && ref.contentHash === undefined) {
    throw new LocalPolicyResolverError(`HTTPS policy list ${ref.source} must pin contentHash`);
  }
  let document: ReturnType<typeof parseLocalPolicyListDocument>;
  try {
    const bytes = ref.source.startsWith('https:')
      ? await fetchPolicyArtifact(ref.source, fetchOptions)
      : await readFile(localSourcePath(ref.source, rootDirectory));
    document = parseLocalPolicyListDocument(parseStrictJson(bytes));
    assertPolicyArtifactEntryLimit(document, fetchOptions?.limits?.maxEntries);
  } catch (error) {
    throw new LocalPolicyResolverError(`Cannot resolve policy list ${ref.source}`, { cause: error });
  }
  const contentHash = canonicalJsonSha256(document as unknown as JsonValue);
  if (ref.contentHash !== undefined && ref.contentHash !== contentHash) {
    throw new LocalPolicyResolverError(`Policy list ${ref.source} does not match pinned contentHash`);
  }
  return { source: ref.source, contentHash, document };
}

async function resolveArtifactOrUndefined(
  ref: LocalPolicyListRef,
  rootDirectory: string,
  fetchOptions?: PolicyArtifactFetchOptions,
): Promise<ResolvedPolicyArtifact | undefined> {
  try {
    return await resolveArtifact(ref, rootDirectory, fetchOptions);
  } catch (error) {
    if (error instanceof LocalPolicyResolverError) return undefined;
    throw error;
  }
}

async function buildLayers(
  root: PolicyRootDocument,
  rootDirectory: string,
  active: ResolvedPolicyBundle | undefined,
  fetchOptions?: PolicyArtifactFetchOptions,
): Promise<ResolvedPolicyLayer[]> {
  return Promise.all(root.layers.map(async (layer) => {
    const previous = active?.layers.find(({ id }) => id === layer.id);
    const freshlyResolvedRef = await resolveArtifactOrUndefined(layer.ref, rootDirectory, fetchOptions);
    const ref = freshlyResolvedRef ?? (layer.onError === 'closed' ? previous?.ref : undefined);

    let except: ResolvedPolicyLayer['except'];
    if (layer.except !== undefined) {
      const freshlyResolvedException = await resolveArtifactOrUndefined(layer.except.ref, rootDirectory, fetchOptions);
      except = freshlyResolvedException === undefined
        ? (previous?.except?.ref === undefined ? { unresolved: true } : { ref: previous.except.ref })
        : { ref: freshlyResolvedException };
    }

    return {
      id: layer.id,
      ...(ref === undefined ? { unresolved: true as const } : { ref }),
      ...(except === undefined ? {} : { except }),
      onError: layer.onError,
      ...(layer.maxResolutionAge === undefined ? {} : { freshness: { maxResolutionAge: layer.maxResolutionAge } }),
      ...(layer.maxAdded === undefined ? {} : { maxAdded: layer.maxAdded }),
      ...(layer.maxRemoved === undefined ? {} : { maxRemoved: layer.maxRemoved }),
    };
  }));
}

function policyContent(bundle: ResolvedPolicyBundle | Omit<ResolvedPolicyBundle, 'digest'>): string {
  const { sequence: _sequence, ...withPossibleDigest } = bundle;
  const { digest: _digest, ...content } = withPossibleDigest as typeof withPossibleDigest & { digest?: string };
  return canonicalizeJson(content as unknown as JsonValue);
}

async function readActiveBundle(path: string): Promise<ResolvedPolicyBundle | undefined> {
  try {
    return parseResolvedPolicyBundle(parseStrictJson(await readFile(path)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new LocalPolicyResolverError(`Cannot read active policy bundle ${path}`, { cause: error });
  }
}

/** Resolve file: inputs into a deterministic bundle, retaining the active bundle when inputs are unchanged. */
export async function resolveLocalPolicyBundle(rootPath: string, activeBundlePath: string, fetchOptions?: PolicyArtifactFetchOptions): Promise<ResolvedPolicyBundle> {
  const root = await readRoot(rootPath);
  const active = await readActiveBundle(activeBundlePath);
  const sequence = active === undefined ? '0' : (BigInt(active.sequence) + 1n).toString();
  const candidateWithoutDigest: Omit<ResolvedPolicyBundle, 'digest'> = {
    schema: POLICY_BUNDLE_SCHEMA,
    layers: await buildLayers(root, dirname(rootPath), active, fetchOptions),
    actions: root.actions,
    honoredRetractors: root.honoredRetractors,
    sequence,
  };
  if (active !== undefined && policyContent(candidateWithoutDigest) === policyContent(active)) return active;
  return parseResolvedPolicyBundle({
    ...candidateWithoutDigest,
    digest: resolvedPolicyBundleDigest(candidateWithoutDigest),
  });
}

/** Atomically replace a bundle file after full validation and monotonic-sequence checks. */
export async function activateResolvedPolicyBundle(bundle: ResolvedPolicyBundle, activeBundlePath: string): Promise<boolean> {
  const candidate = parseResolvedPolicyBundle(bundle);
  const active = await readActiveBundle(activeBundlePath);
  if (active?.digest === candidate.digest) return false;
  if (active !== undefined && BigInt(candidate.sequence) <= BigInt(active.sequence)) {
    throw new LocalPolicyResolverError(`Refusing policy bundle rollback from sequence ${active.sequence} to ${candidate.sequence}`);
  }
  const temporaryPath = `${activeBundlePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporaryPath, canonicalJsonBytes(candidate as unknown as JsonValue));
  await rename(temporaryPath, activeBundlePath);
  return true;
}

/** Resolve and atomically activate a local policy root. */
export async function resolveAndActivateLocalPolicyBundle(rootPath: string, activeBundlePath: string): Promise<ResolvedPolicyBundle> {
  const bundle = await resolveLocalPolicyBundle(rootPath, activeBundlePath);
  await activateResolvedPolicyBundle(bundle, activeBundlePath);
  return bundle;
}
