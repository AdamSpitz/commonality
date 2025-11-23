import { base58btc } from "multiformats/bases/base58";
import { CID } from "multiformats/cid";

// IPFS gateway URL - using Pinata as per spec
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

/**
 * Convert a bytes32 hex string to an IPFS CID string
 * Assumes CIDv1 with SHA-256 hash (32 bytes = 256 bits)
 */
export function bytes32ToCid(bytes32: `0x${string}`): string {
  // Remove 0x prefix and convert to bytes
  const digestHex = bytes32.slice(2);
  const digestBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    digestBytes[i] = parseInt(digestHex.slice(i * 2, i * 2 + 2), 16);
  }

  // Create CIDv1 with:
  // - version: 1
  // - codec: 0x55 (raw) or 0x70 (dag-pb) - using dag-pb for JSON
  // - hash function: 0x12 (sha2-256)
  // - hash length: 0x20 (32 bytes)
  const multihash = new Uint8Array(34);
  multihash[0] = 0x12; // sha2-256
  multihash[1] = 0x20; // 32 bytes
  multihash.set(digestBytes, 2);

  // Create CID - using dag-pb codec (0x70) for JSON content
  const cid = CID.createV1(0x70, { code: 0x12, size: 32, digest: multihash.slice(2), bytes: multihash });

  return cid.toString();
}

/**
 * Convert an IPFS CID string to bytes32 hex
 * Extracts the 32-byte SHA-256 digest
 */
export function cidToBytes32(cidString: string): `0x${string}` {
  const cid = CID.parse(cidString);
  const digest = cid.multihash.digest;

  if (digest.length !== 32) {
    throw new Error(`Expected 32-byte digest, got ${digest.length} bytes`);
  }

  const hex = Array.from(digest)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `0x${hex}` as `0x${string}`;
}

/**
 * Statement JSON structure (from specs/statements.md)
 */
export interface StatementContent {
  statementType: string;
  content: string;
  references?: Array<{
    statementId: string;
    label?: string;
    relationship?: "supports" | "opposes" | "alternative" | "related";
  }>;
  metadata?: {
    title?: string;
    version?: string;
    createdDate?: string;
  };
}

/**
 * Fetch statement content from IPFS
 * Returns null if fetch fails
 */
export async function fetchStatementContent(
  cidString: string
): Promise<StatementContent | null> {
  try {
    const url = `${IPFS_GATEWAY}/${cidString}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Failed to fetch IPFS content for ${cidString}: ${response.status}`);
      return null;
    }

    const content = (await response.json()) as Record<string, unknown>;

    // Basic validation
    if (typeof content.statementType !== "string" || typeof content.content !== "string") {
      console.warn(`Invalid statement format for ${cidString}`);
      return null;
    }

    return content as unknown as StatementContent;
  } catch (error) {
    console.warn(`Error fetching IPFS content for ${cidString}:`, error);
    return null;
  }
}

/**
 * Extract a short excerpt from statement content
 */
export function extractExcerpt(content: string, maxLength = 200): string {
  // Strip markdown formatting for excerpt
  const plainText = content
    .replace(/[#*_~`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.slice(0, maxLength - 3) + "...";
}
