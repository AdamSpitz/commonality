/**
 * IPFS utilities for Pubstarter metadata fetching
 */

// IPFS gateway URL - using Pinata as per spec
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

/**
 * Project metadata JSON structure
 * This should match the structure defined in the Pubstarter spec
 */
export interface ProjectMetadata {
  name: string;
  description: string;
  image?: string;
  externalUrl?: string;
  tags?: string[];
  [key: string]: unknown; // Allow additional fields
}

/**
 * Fetch project metadata from IPFS
 * Returns null if fetch fails
 */
export async function fetchProjectMetadata(
  cidString: string
): Promise<ProjectMetadata | null> {
  try {
    const url = `${IPFS_GATEWAY}/${cidString}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Failed to fetch IPFS metadata for ${cidString}: ${response.status}`);
      return null;
    }

    const content = (await response.json()) as Record<string, unknown>;

    // Basic validation - name and description are required
    if (typeof content.name !== "string" || typeof content.description !== "string") {
      console.warn(`Invalid project metadata format for ${cidString}`);
      return null;
    }

    return content as ProjectMetadata;
  } catch (error) {
    console.warn(`Error fetching IPFS metadata for ${cidString}:`, error);
    return null;
  }
}

/**
 * Extract a short excerpt from project description
 */
export function extractExcerpt(description: string, maxLength = 200): string {
  // Strip markdown formatting for excerpt
  const plainText = description
    .replace(/[#*_~`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.slice(0, maxLength - 3) + "...";
}
