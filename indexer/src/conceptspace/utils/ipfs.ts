import { CID } from "multiformats/cid";
import { IpfsCidV1, IpfsCidBytes32 } from "../../utils/cid-types";

/**
 * Parsed statement content from IPFS.
 * Expects DisplayableDocument format per specs/statements.md.
 */
export interface FetchedStatementContent {
  /** The raw parsed JSON object (stored as JSON string in the database) */
  raw: Record<string, unknown>;
  /** The text content for excerpt generation */
  textContent: string;
  /** Statement type (from extras.statementType) */
  statementType: string | null;
  /** Title (always null for DisplayableDocument format) */
  title: string | null;
}

/**
 * Fetch statement content from IPFS.
 * Expects DisplayableDocument format per specs/statements.md.
 * Returns null if fetch fails or content is not a valid DisplayableDocument.
 */
export async function fetchStatementContent(
  ipfsGateway: string,
  cidString: string
): Promise<FetchedStatementContent | null> {
  try {
    const url = `${ipfsGateway}/${cidString}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Failed to fetch IPFS content for ${cidString}: ${response.status}`);
      return null;
    }

    const raw = (await response.json()) as Record<string, unknown>;

    // Validate DisplayableDocument format per specs/statements.md
    if (typeof raw.format === "string" && typeof raw.content === "string") {
      const extras =
        typeof raw.extras === "object" && raw.extras !== null && !Array.isArray(raw.extras)
          ? (raw.extras as Record<string, unknown>)
          : null;

      return {
        raw,
        textContent: raw.content as string,
        statementType:
          extras && typeof extras.statementType === "string" ? extras.statementType : null,
        title: null,
      };
    }

    // Not a valid DisplayableDocument
    console.warn(`Invalid DisplayableDocument format for ${cidString}`);
    return null;
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
