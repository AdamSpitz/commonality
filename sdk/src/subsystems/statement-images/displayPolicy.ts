/**
 * Operator display rule for statement-image pixels.
 *
 * This is not part of mosaicTiles. A missing or inactive bundle hides nothing.
 * A named CID is hidden only when the active bundle's refuse-serve action blocks it.
 * No on-chain negative is published.
 */

import type { PolicyRuntimeSnapshot } from "../../policy-lists/runtime.js";

export function statementImageCidHiddenByPolicy(
  snapshot: PolicyRuntimeSnapshot | undefined,
  cid: string,
): boolean {
  if (!snapshot?.evaluator) return false;
  return snapshot.evaluator.evaluate("refuse-serve", { cid }).decision === "block";
}
