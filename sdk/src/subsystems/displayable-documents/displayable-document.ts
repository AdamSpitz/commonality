/**
 * Displayable Documents
 *
 * A general-purpose system for immutable, displayable content. Designed for use cases
 * where users sign or attest to documents and need confidence that what they see is
 * exactly what they're signing.
 *
 * See specs/subsystems/conceptspace/displayable-documents.md for the full specification.
 */

import { type Address, type Hash } from 'viem';
import { uploadToIPFS, fetchFromIPFS, IPFSConfig } from '../../utils/ipfs.js';
import { type WriteClients } from '../../utils/ethereum.js';
import { publishData, readData, publishedDataCidToId, createEventCacheCidResolver, type DisplayPolicy, type CidResolution, type PublishedDataCache, type PublishedDataContract, type PublishedDataId, type PublishedDataReadResult, type PublishedDataCid } from '../published-data/index.js';
import type { SDKMachinery } from '../../machinery.js';
import { IpfsCidV1 } from '../../utils/cid-types.js';

// ============================================================================
// Types
// ============================================================================

/** Supported display formats */
export type DisplayFormat = 'text/plain' | 'markdown-restricted';

/** An asset embedded inline with base64 data */
export interface InlineAsset {
  mimeType: string;
  data: string; // base64-encoded
}

/** An asset referenced by CID */
export interface CidAsset {
  mimeType: string;
  cid: string;
}

/** An asset can be either inline or referenced by CID */
export type Asset = InlineAsset | CidAsset;

/** A reference to another immutable document */
export interface DocumentReference {
  cid: string;
  label?: string;
}

/**
 * A Displayable Document - immutable content designed to be rendered for humans.
 *
 * Key principles:
 * - Display-first: The document IS the displayable content
 * - Everything visible: Renderers MUST display every field
 * - Immutable references only: No external mutable URLs
 */
export interface DisplayableDocument {
  /** The display format (required) */
  format: DisplayFormat;

  /** The primary displayable content (required) */
  content: string;

  /** Named binary assets referenced from content (optional) */
  assets?: Record<string, Asset>;

  /** CID links to other documents (optional) */
  references?: DocumentReference[];

  /** Freeform structured data, always displayed in full (optional) */
  extras?: Record<string, unknown>;
}

/** Result of validation */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Canonical JSON
// ============================================================================

/**
 * Produces canonical JSON encoding: sorted keys, no unnecessary whitespace, UTF-8.
 * This ensures identical content produces identical CIDs.
 */
export function toCanonicalJson(obj: unknown): string {
  return JSON.stringify(obj, sortedReplacer);
}

/**
 * JSON replacer that sorts object keys for canonical encoding.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

// ============================================================================
// Creation
// ============================================================================

/** Options for creating a displayable document */
export interface CreateDisplayableDocumentOptions {
  format: DisplayFormat;
  content: string;
  assets?: Record<string, Asset>;
  references?: DocumentReference[];
  extras?: Record<string, unknown>;
}

/**
 * Creates a DisplayableDocument with canonical JSON representation.
 *
 * @param options - The document fields
 * @returns The document object (use toCanonicalJson() for the JSON string)
 * @throws Error if validation fails
 */
export function createDisplayableDocument(
  options: CreateDisplayableDocumentOptions
): DisplayableDocument {
  const doc: DisplayableDocument = {
    format: options.format,
    content: options.content,
  };

  // Only include optional fields if they have content
  if (options.assets && Object.keys(options.assets).length > 0) {
    doc.assets = options.assets;
  }

  if (options.references && options.references.length > 0) {
    doc.references = options.references;
  }

  if (options.extras && Object.keys(options.extras).length > 0) {
    doc.extras = options.extras;
  }

  // Validate before returning
  const validation = validateDisplayableDocument(doc);
  if (!validation.valid) {
    throw new Error(`Invalid displayable document: ${validation.errors.join(', ')}`);
  }

  return doc;
}

// ============================================================================
// Validation
// ============================================================================

/** Maximum content size (50k characters per spec) */
const MAX_CONTENT_SIZE = 50000;

/** Valid display formats */
const VALID_FORMATS: DisplayFormat[] = ['text/plain', 'markdown-restricted'];

/** Pattern to detect external URLs in markdown */
const EXTERNAL_URL_PATTERN = /\]\s*\(\s*https?:\/\//i;

/** Pattern to detect external URLs in image references */
const EXTERNAL_IMAGE_PATTERN = /!\[.*?\]\s*\(\s*https?:\/\//i;

/**
 * Validates a displayable document against the spec.
 *
 * Checks:
 * - Required fields (format, content)
 * - Valid format value
 * - Content size limit
 * - No external URLs in markdown-restricted content
 * - Asset structure
 * - Reference structure
 */
export function validateDisplayableDocument(doc: unknown): ValidationResult {
  const errors: string[] = [];

  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Document must be an object'] };
  }

  const d = doc as Record<string, unknown>;

  // Required: format
  if (!d.format) {
    errors.push('Missing required field: format');
  } else if (typeof d.format !== 'string') {
    errors.push('Field "format" must be a string');
  } else if (!VALID_FORMATS.includes(d.format as DisplayFormat)) {
    errors.push(`Invalid format "${d.format}". Must be one of: ${VALID_FORMATS.join(', ')}`);
  }

  // Required: content
  if (d.content === undefined || d.content === null) {
    errors.push('Missing required field: content');
  } else if (typeof d.content !== 'string') {
    errors.push('Field "content" must be a string');
  } else {
    // Content size check
    if (d.content.length > MAX_CONTENT_SIZE) {
      errors.push(`Content exceeds maximum size of ${MAX_CONTENT_SIZE} characters`);
    }

    // Check for external URLs in markdown-restricted format
    if (d.format === 'markdown-restricted') {
      if (EXTERNAL_URL_PATTERN.test(d.content)) {
        errors.push('External URLs are forbidden in markdown-restricted format');
      }
      if (EXTERNAL_IMAGE_PATTERN.test(d.content)) {
        errors.push('External image URLs are forbidden in markdown-restricted format');
      }
    }
  }

  // Optional: assets
  if (d.assets !== undefined) {
    if (typeof d.assets !== 'object' || d.assets === null || Array.isArray(d.assets)) {
      errors.push('Field "assets" must be an object');
    } else {
      const assets = d.assets as Record<string, unknown>;
      for (const [key, asset] of Object.entries(assets)) {
        const assetErrors = validateAsset(asset, key);
        errors.push(...assetErrors);
      }
    }
  }

  // Optional: references
  if (d.references !== undefined) {
    if (!Array.isArray(d.references)) {
      errors.push('Field "references" must be an array');
    } else {
      d.references.forEach((ref, idx) => {
        const refErrors = validateReference(ref, idx);
        errors.push(...refErrors);
      });
    }
  }

  // Optional: extras (freeform, just check it's an object if present)
  if (d.extras !== undefined) {
    if (typeof d.extras !== 'object' || d.extras === null || Array.isArray(d.extras)) {
      errors.push('Field "extras" must be an object');
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateAsset(asset: unknown, key: string): string[] {
  const errors: string[] = [];
  const prefix = `Asset "${key}"`;

  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  const a = asset as Record<string, unknown>;

  if (!a.mimeType || typeof a.mimeType !== 'string') {
    errors.push(`${prefix}: missing or invalid mimeType`);
  }

  const hasData = 'data' in a;
  const hasCid = 'cid' in a;

  if (!hasData && !hasCid) {
    errors.push(`${prefix}: must have either "data" or "cid" field`);
  } else if (hasData && hasCid) {
    errors.push(`${prefix}: cannot have both "data" and "cid" fields`);
  } else if (hasData && typeof a.data !== 'string') {
    errors.push(`${prefix}: "data" must be a string (base64)`);
  } else if (hasCid && typeof a.cid !== 'string') {
    errors.push(`${prefix}: "cid" must be a string`);
  }

  return errors;
}

function validateReference(ref: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Reference[${index}]`;

  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  const r = ref as Record<string, unknown>;

  if (!r.cid || typeof r.cid !== 'string') {
    errors.push(`${prefix}: missing or invalid cid`);
  }

  if (r.label !== undefined && typeof r.label !== 'string') {
    errors.push(`${prefix}: label must be a string if provided`);
  }

  return errors;
}

/**
 * Checks if a document is a valid DisplayableDocument.
 */
export function isDisplayableDocument(doc: unknown): doc is DisplayableDocument {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return false;
  }

  const d = doc as Record<string, unknown>;
  return 'format' in d && 'content' in d;
}

// ============================================================================
// Conceptspace Statement Helpers
// ============================================================================

/** Options for creating a conceptspace statement */
export interface CreateStatementOptions {
  /** The statement content (markdown) */
  content: string;

  /** Optional topic/category hint for indexers */
  topic?: string;

  /** When the statement was authored (defaults to now) */
  createdDate?: string;

  /** References to other documents */
  references?: DocumentReference[];

  /** Additional extras fields */
  extras?: Record<string, unknown>;
}

/**
 * Creates a conceptspace statement as a displayable document.
 *
 * This is a convenience function that pre-populates extras with
 * the conceptspace-specific fields (statementType, topic, createdDate).
 */
export function createStatement(options: CreateStatementOptions): DisplayableDocument {
  const extras: Record<string, unknown> = {
    statementType: 'statement',
    ...options.extras,
  };

  if (options.topic) {
    extras.topic = options.topic;
  }

  extras.createdDate = options.createdDate || new Date().toISOString();

  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: options.content,
    references: options.references,
    extras,
  });
}

// ============================================================================
// Shared encoding helpers
// ============================================================================

function canonicalDocumentBytes(doc: DisplayableDocument): Uint8Array {
  return new TextEncoder().encode(toCanonicalJson(doc));
}

function parseDisplayableDocumentBytes(data: Uint8Array): DisplayableDocument | null {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(data));
  } catch {
    return null;
  }

  const validation = validateDisplayableDocument(raw);
  return validation.valid ? raw as DisplayableDocument : null;
}

// ============================================================================
// PublishedData Publish / Fetch
// ============================================================================

export interface PublishedDocumentResult {
  cid: PublishedDataCid;
  dataId: PublishedDataId;
  txHash: Hash;
}

export type DocumentReadResult =
  | { status: 'active'; document: DisplayableDocument }
  | { status: 'retracted'; retractedDocument: DisplayableDocument }
  | { status: 'unavailable' }
  | { status: 'not-published' }
  | { status: 'invalid' };

export type PublishedDocumentReadResult = Exclude<DocumentReadResult, { status: 'unavailable' }>;

export interface DocumentReader {
  read(cid: IpfsCidV1, policy?: DisplayPolicy): Promise<DocumentReadResult>;
}

export interface DocumentStore extends DocumentReader {
  publish(doc: DisplayableDocument): Promise<PublishedDocumentResult>;
}

export type CidResolver = (dataId: PublishedDataId, policy?: DisplayPolicy) => Promise<CidResolution>;

/** Publish a DisplayableDocument through PublishedData using canonical JSON bytes. */
export async function publishDocumentToPublishedData(
  clients: WriteClients,
  publishedDataContract: PublishedDataContract,
  doc: DisplayableDocument,
): Promise<PublishedDocumentResult> {
  const validation = validateDisplayableDocument(doc);
  if (!validation.valid) {
    throw new Error(`Invalid displayable document: ${validation.errors.join(', ')}`);
  }

  return publishData(clients, publishedDataContract, canonicalDocumentBytes(doc));
}

/**
 * Read a DisplayableDocument from PublishedData and validate the decoded bytes.
 *
 * Invalid JSON or invalid document shape is reported separately from missing or
 * retracted data so callers do not accidentally render malformed content.
 */
export async function readPublishedDocument(
  cache: PublishedDataCache,
  publisher: Address,
  cidOrDataId: PublishedDataCid | PublishedDataId | string,
): Promise<PublishedDocumentReadResult> {
  const dataId = cidOrDataId.startsWith('0x') ? cidOrDataId as PublishedDataId : publishedDataCidToId(cidOrDataId);
  const result: PublishedDataReadResult = await readData(cache, publisher, dataId);
  if (result.status === 'not-published') return { status: 'not-published' };

  if (result.status === 'active') {
    const document = parseDisplayableDocumentBytes(result.data);
    return document ? { status: 'active', document } : { status: 'invalid' };
  }

  const retractedDocument = parseDisplayableDocumentBytes(result.retractedData);
  return retractedDocument ? { status: 'retracted', retractedDocument } : { status: 'invalid' };
}

export async function readActivePublishedDocument(
  cache: PublishedDataCache,
  publisher: Address,
  cidOrDataId: PublishedDataCid | PublishedDataId | string,
): Promise<DisplayableDocument | null> {
  const result = await readPublishedDocument(cache, publisher, cidOrDataId);
  return result.status === 'active' ? result.document : null;
}

function documentReadResultFromCidResolution(resolution: CidResolution): DocumentReadResult {
  if (resolution.status === 'not-published') return { status: 'not-published' };

  if (resolution.status === 'active') {
    const document = parseDisplayableDocumentBytes(resolution.data);
    return document ? { status: 'active', document } : { status: 'invalid' };
  }

  const retractedDocument = parseDisplayableDocumentBytes(resolution.retractedData);
  return retractedDocument ? { status: 'retracted', retractedDocument } : { status: 'invalid' };
}

export interface PublishedDataDocumentReaderOptions {
  machinery?: SDKMachinery;
  resolveByCid?: CidResolver;
}

export interface PublishedDataDocumentStoreOptions extends PublishedDataDocumentReaderOptions {
  clients: WriteClients;
  publishedDataContract: PublishedDataContract;
}

/**
 * Build the CID-first read adapter backed by PublishedData.
 *
 * Callers name documents by CID; publisher enumeration and retraction policy are
 * internal to the resolver. Transient resolver/indexer failures map to
 * `unavailable`, not `not-published`, so aggregate callers do not silently drop
 * support during infrastructure outages.
 */
export function createPublishedDataDocumentReader(options: PublishedDataDocumentReaderOptions): DocumentReader {
  const resolveByCid = options.resolveByCid ?? (options.machinery ? createEventCacheCidResolver(options.machinery) : undefined);

  return {
    async read(cid, policy) {
      try {
        if (!resolveByCid) return { status: 'unavailable' };
        return documentReadResultFromCidResolution(await resolveByCid(publishedDataCidToId(cid), policy));
      } catch {
        return { status: 'unavailable' };
      }
    },
  };
}

/** Build the CID-first DocumentStore adapter backed by PublishedData. */
export function createPublishedDataDocumentStore(options: PublishedDataDocumentStoreOptions): DocumentStore {
  const reader = createPublishedDataDocumentReader(options);

  return {
    publish(doc) {
      return publishDocumentToPublishedData(options.clients, options.publishedDataContract, doc);
    },
    read(cid, policy) {
      return reader.read(cid, policy);
    },
  };
}

// ============================================================================
// IPFS Publish / Fetch
// ============================================================================

/**
 * Publish a DisplayableDocument to IPFS using canonical JSON encoding.
 *
 * Canonical JSON (sorted keys, no whitespace) ensures identical documents
 * always produce the same CID.
 *
 * @param doc - A valid DisplayableDocument
 * @returns The IPFS CID of the published document
 * @throws Error if the document fails validation
 */
export async function publishDocument(ipfsConfig: IPFSConfig, doc: DisplayableDocument): Promise<IpfsCidV1> {
  const validation = validateDisplayableDocument(doc);
  if (!validation.valid) {
    throw new Error(`Invalid displayable document: ${validation.errors.join(', ')}`);
  }

  // Canonical-encode then re-parse so uploadToIPFS serializes with sorted keys
  const canonical = toCanonicalJson(doc);
  const normalized = JSON.parse(canonical) as object;

  return uploadToIPFS(ipfsConfig, normalized);
}

/**
 * Fetch a DisplayableDocument from IPFS by CID and validate it.
 *
 * @param cid - The IPFS CID to fetch
 * @returns The validated DisplayableDocument, or null if not found or invalid
 */
export async function fetchDocument(ipfsConfig: IPFSConfig, cid: string, timeout?: number): Promise<DisplayableDocument | null> {
  const raw = await fetchFromIPFS(ipfsConfig, cid, timeout);
  if (raw === null) {
    return null;
  }

  const validation = validateDisplayableDocument(raw);
  if (!validation.valid) {
    return null;
  }

  return raw as DisplayableDocument;
}

export function createIpfsDocumentStore(ipfsConfig: IPFSConfig, options: { readTimeout?: number } = {}): DocumentStore {
  return {
    async publish(doc) {
      const cid = await publishDocument(ipfsConfig, doc);
      return {
        cid,
        dataId: publishedDataCidToId(cid),
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
    },
    async read(cid) {
      try {
        const document = await fetchDocument(ipfsConfig, cid, options.readTimeout);
        return document ? { status: 'active', document } : { status: 'not-published' };
      } catch {
        return { status: 'unavailable' };
      }
    },
  };
}
