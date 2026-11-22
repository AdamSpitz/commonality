import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { mosaicTiles } from "./mosaic.js";

const statementId = "0xstatement";
const attester = "0xAttester";
const alice = "0xAlice";
const bob = "0xBob";
const imageA = "0xaaa";
const imageB = "0xbbb";

function base(overrides: Partial<Parameters<typeof mosaicTiles>[0]> = {}) {
  return {
    statementId,
    attester,
    beliefs: { [alice]: 1, [bob]: 1 },
    adoptions: [{ signer: alice, statementId, imageId: imageA, adopted: true }],
    safety: [{ attester, statementId, imageId: imageA, active: true }],
    ...overrides,
  };
}

describe("mosaicTiles", () => {
  it("shows the triple only when belief, adoption, and a current yes all exist", () => {
    assert.deepEqual(mosaicTiles(base()), [
      { statementId, imageId: imageA, signers: [alice.toLowerCase()] },
    ]);
  });

  it("hides a picture the signer adopted but does not believe", () => {
    assert.deepEqual(mosaicTiles(base({ beliefs: { [alice]: 0 } })), []);
  });

  it("hides when the chosen attester has no current yes", () => {
    assert.deepEqual(
      mosaicTiles(
        base({
          safety: [{ attester, statementId, imageId: imageA, active: false }],
        }),
      ),
      [],
    );
  });

  it("ignores a different attester's yes", () => {
    assert.deepEqual(
      mosaicTiles(
        base({
          safety: [{ attester: "0xOther", statementId, imageId: imageA, active: true }],
        }),
      ),
      [],
    );
  });

  it("keeps one image per signer and does not repeat the same image", () => {
    assert.deepEqual(
      mosaicTiles(
        base({
          adoptions: [
            { signer: alice, statementId, imageId: imageB, adopted: true },
            { signer: alice, statementId, imageId: imageA, adopted: true },
            { signer: bob, statementId, imageId: imageA, adopted: true },
          ],
          safety: [
            { attester, statementId, imageId: imageA, active: true },
            { attester, statementId, imageId: imageB, active: true },
          ],
        }),
      ),
      [{ statementId, imageId: imageA, signers: [alice.toLowerCase(), bob.toLowerCase()] }],
    );
  });
});
