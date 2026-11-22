# Signer-chosen images for statements

**Status: adoption and mosaic-safety records started 2026-08-14.** `StatementImages` records signer adoptions and replaceable positive mosaic-safety yeses (prompt hash required; revoke withdraws the yes). The SDK `mosaicTiles` helper is the honest-wall rule: current belief, current adoption, and a yes from the app's chosen attester, one image per signer, duplicate images not tiled. Not deployed, not indexed, and not shown in the UI. Design: this file. Focus: [focus.md](/focus.md).

A statement stays a sentence. People may also attach pictures they want shown beside that sentence. The pictures are not the statement, not a canonical poster chosen by the author, and not an NFT. Counts, implication, and alignment keep reading the text.

Related: [marketing/memes.md](./marketing/memes.md) (organizer share cards, a different object), [shaping your cause's statements](/docs/founder/shaping-your-cause-statements.md) (coherence badge, the analogy), [ADR 0008](../decisions/0008-operated-surfaces-are-lenses.md) (no protocol admission), [alignment attestations](/specs/tech/subsystems/aligning/README.md) (do not reuse).

## Why

Supporter counts are a sentence union: "17,445 people have signed any of these 11 statements." That is correct and dull. A wall of supporter-chosen pictures is how that number becomes something people forward.

The author does not pick the image. There is no central art for a statement. Each signer chooses which picture or pictures to adopt for that sentence. Their own profile may show whatever they attached. An honest third-party app that shows who signed what shows the triple together: signer, image, statement. A dishonest app can lie; the signature does not force anyone to display anything.

## Two signatures

Support and display are different acts.

- **Statement signature.** This is what counts and what implication reads. Unchanged. No image bytes in the statement document.
- **Image adoption.** A separate signed pointer: this account adopts this image CID for this statement CID. It is permission to attribute that picture to that signer for that sentence. It is not a second statement, and it is not required in order to count as a supporter.

Changing the picture does not re-sign the sentence and must not double-count. Signing the sentence does not require picking art. An honest app shows a picture only when both the statement signature and a matching adoption exist. Showing no pictures is still honest.

The image is content-addressed. A URL that can change is not an adoption.

## What an honest app shows

Layout keeps the sentence next to the picture. The sentence does not have to be baked into the pixels. A medium-length sentence would make that card lame, and a wordless drawing is allowed.

A screenshot can still crop the sentence away. That is accepted. A generated link-unfurl is a different object: it may composite the sentence at share time without requiring the signer's art to contain the text. Organizer statement cards in [memes.md](./marketing/memes.md) stay that other object. They are not this adoption record, and they are not canonical art.

Do not treat "most adopted image" as the statement's poster. That recreates a canonical image by popularity, and sybils can buy it. Show at most one attested image per signer in a mosaic. Do not tile duplicate images into a pattern.

## Mosaic-safety attestation

Hostile adoptions are allowed on the signer's own profile. They are not safe to drop into a stranger's list of everyone who signed a sentence. The obvious case is a signer attaching a neanderthal, or pixels that read "you're a retard if you believe this." Worse cases the same check has to catch:

- A picture that does not contradict the sentence but insults the supporter set.
- A photo of an identifiable person or organization who did not sign, so the wall reads as their endorsement.
- A second claim smuggled in the picture.
- Content the checker cannot classify. Fail closed.

That predicate is **mosaic-safety**: safe to show in a gallery of people who signed this sentence. It is not "is this image aligned with this statement?" Do not reuse alignment attestations. Alignment means this work advances this claim. A picture is not work, and "not undermining the proposition" misses the neanderthal and the false-endorsement cases.

The attestation subject is the pair `(statement CID, image CID)`. The signer does not change the pixels, so the check is not per signer. Record the model and prompt hash. The same attester may revoke its own yes. Revocation is not a published negative judgment. Positive-only still holds: silence, or a withdrawn yes, never an on-chain "this image is hostile."

A jailbreak that cannot be revoked is permanent gallery poison. UIs treat missing or revoked as hide.

This is a judgment, not a trivial objective job. The default bot's prompt will become a house style. That is acceptable only because apps choose the attester.

## Who runs the checker, and who pays

Same shape as the coherence badge, not a new admission layer. Protocol does not require the check. A third-party site that wants to show images hard-codes an attester account it trusts and shows only images that account currently attests.

We can ship a default bot. It should be generic enough that most apps can use it, and replaceable so a cause that cares about tone is not stuck with our prompt. Hard-coding an address is the escape hatch. Do not describe the default as the one honest checker.

The signer does not pay. A fee stops idle spam and does nothing to someone who wants one poison picture on the wall. It also hides unpaid signers from the mosaic. The app chooses the attester and benefits from the check, so the app pays, or runs the check itself. The signer's profile does not wait on attestation.

## What this is not

- Not a transferrable receipt, and not an extension of LazyGiving's ERC-1155 giving levels.
- Not author-set canonical art. If an author image is ever allowed, it is just another pair, not the default poster.
- Not part of the coherence badge. Coherence is about summary versus planks. Asking it to judge pictures turns a construction check into taste.
- Not a command that honest apps must display images.
- Not something implication or the supporter count reads.
