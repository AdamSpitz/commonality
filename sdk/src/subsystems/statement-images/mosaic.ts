/**
 * Honest third-party wall for signer-chosen statement images.
 *
 * A tile appears only when the signer currently believes the statement, still
 * adopts the image, and the app's chosen attester currently says yes for that
 * (statement, image) pair. Missing or revoked safety is hide, not a negative.
 * One tile per image. One image per signer (lowest image id if they adopted several).
 */

export const BELIEVES = 1;

export interface ImageAdoption {
  signer: string;
  statementId: string;
  imageId: string;
  adopted: boolean;
}

export interface MosaicSafetyYes {
  attester: string;
  statementId: string;
  imageId: string;
  active: boolean;
}

export interface MosaicTile {
  statementId: string;
  imageId: string;
  signers: string[];
}

export interface AdoptionPointer {
  signer: string;
  statementId: string;
  imageId: string;
}

export interface MosaicInput {
  statementId: string;
  attester: string;
  /** signer address → current belief state (1 = believes). */
  beliefs: Readonly<Record<string, number>>;
  adoptions: readonly ImageAdoption[];
  safety: readonly MosaicSafetyYes[];
}

function norm(value: string): string {
  return value.toLowerCase();
}

/** Current adoptions whose signer still believes. No safety filter and no image fetch. */
export function believingAdoptionPointers(input: {
  statementId?: string;
  beliefs: Readonly<Record<string, number>>;
  adoptions: readonly ImageAdoption[];
}): AdoptionPointer[] {
  const statementId = input.statementId ? norm(input.statementId) : undefined;
  const rows: AdoptionPointer[] = [];
  for (const adoption of input.adoptions) {
    if (!adoption.adopted) continue;
    const adoptedStatement = norm(adoption.statementId);
    if (statementId && adoptedStatement !== statementId) continue;
    const signer = norm(adoption.signer);
    const belief = input.beliefs[signer] ?? input.beliefs[adoption.signer];
    if (belief !== BELIEVES) continue;
    rows.push({ signer, statementId: adoptedStatement, imageId: norm(adoption.imageId) });
  }
  rows.sort((a, b) =>
    a.signer < b.signer ? -1
      : a.signer > b.signer ? 1
        : a.imageId < b.imageId ? -1
          : a.imageId > b.imageId ? 1
            : 0,
  );
  return rows;
}

export function mosaicTiles(input: MosaicInput): MosaicTile[] {
  const statementId = norm(input.statementId);
  const attester = norm(input.attester);
  const safe = new Set(
    input.safety
      .filter(
        (yes) =>
          yes.active &&
          norm(yes.attester) === attester &&
          norm(yes.statementId) === statementId,
      )
      .map((yes) => norm(yes.imageId)),
  );

  const bySigner = new Map<string, string>();
  for (const adoption of input.adoptions) {
    if (!adoption.adopted) continue;
    if (norm(adoption.statementId) !== statementId) continue;
    const signer = norm(adoption.signer);
    if (input.beliefs[signer] !== BELIEVES && input.beliefs[adoption.signer] !== BELIEVES) continue;
    const imageId = norm(adoption.imageId);
    if (!safe.has(imageId)) continue;
    const current = bySigner.get(signer);
    if (current === undefined || imageId < current) bySigner.set(signer, imageId);
  }

  const byImage = new Map<string, string[]>();
  for (const [signer, imageId] of bySigner) {
    const signers = byImage.get(imageId) ?? [];
    signers.push(signer);
    byImage.set(imageId, signers);
  }

  return [...byImage.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([imageId, signers]) => ({
      statementId,
      imageId,
      signers: [...signers].sort(),
    }));
}
