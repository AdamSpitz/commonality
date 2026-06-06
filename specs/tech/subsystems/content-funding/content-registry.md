# Content Registry

A simple on-chain registry that enforces content-item uniqueness across assurance contracts within a single platform deployment.

Each platform (Twitter, YouTube, Substack) gets its own ContentRegistry instance, deployed alongside the platform's ChannelRegistry, ChannelEscrow, and CreatorAssuranceContractFactory. See the [per-platform deployment](README.md#per-platform-deployment) section for rationale. Uniqueness is enforced within a platform deployment — competing deployments for the same platform each have their own content-item space, with the UI deciding which to trust. If Commonality later supports user-selectable chains, each chain's ContentRegistry deployment is intentionally a separate uniqueness namespace; a content item registered on Base and the same content item registered on Ethereum L1 are different platform deployments, not a single bridged registry entry.

## The contract

```
mapping(uint256 contentId => address assuranceContract)
```

The platform's assurance contract factory checks the registry at creation time and reverts if any listed content ID is already claimed by an *active* contract. This enforces the scarcity that makes secondary markets work: if you want to retroactively fund *that specific tweet*, you can't just create a new contract — you must buy tokens from the existing one.

## Content ID scheme

Content IDs are `keccak256` hashes of canonical identifiers:

| Source | Canonical ID | Content ID |
|---|---|---|
| Twitter/X | `twitter:uid:12345678:18347` | `keccak256("twitter:uid:12345678:18347")` |
| YouTube | `youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ` | `keccak256("youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ")` |
| Substack | `substack:example/my-post` | `keccak256("substack:example/my-post")` |
| IPFS | `ipfs:bafyXyz...` | `keccak256("ipfs:bafyXyz...")` |

ERC-1155 token IDs are `uint256` and `keccak256` produces `bytes32` — same size, direct mapping. The content ID *is* the token type ID.

These identifiers must come from the canonicalization rules in [canonicalization.md](canonicalization.md), not from raw user input. The registry's uniqueness guarantee only works if all clients normalize equivalent URLs and platform IDs to the same canonical string before hashing.

The contract doesn't validate that the content exists — it just enforces ID uniqueness. Social and market forces handle the rest (no one will fund a contract referencing garbage content IDs). Maybe we can also make the UI check the links or show the content (or an excerpt) inline, but it doesn't need to be validated at the contract level.

## Failed contracts free their content items

When an assurance contract **fails** (deadline passes without reaching threshold), the content items it registered should be freed in the registry. There's no reason to permanently lock a content item to a failed funding attempt. The creator (or anyone else, subject to [channel-claiming rules](channel-claiming.md)) should be able to take another run at it — with different prices, a different threshold, a different batch of content, whatever.

Implementation: the registry's mapping gets cleared for each content item when the contract enters the failed state. This could happen via:
- The factory calling back to the registry when it observes a failure, or
- The registry checking the contract's status on subsequent registration attempts (lazy cleanup), or
- An explicit `releaseContentItems()` function on the failed contract that anyone can call.

The lazy approach is simplest (no callback infrastructure), but it means stale entries sit in the registry until someone tries to re-register those content items. That's probably fine — the only cost is that a lookup returns a dead contract address, which callers can check.

**Successful contracts** keep their registry entries permanently. The content items remain associated with those tokens forever, which is what makes the secondary market work.

## Plaintext event for off-chain resolution

The platform's factory should emit an event that includes the plaintext canonical ID alongside the hash when a content item is registered:

```solidity
event ContentItemRegistered(
    uint256 indexed contentId,    // keccak256 hash
    address indexed assuranceContract,
    string canonicalId            // e.g., "twitter:uid:12345678:18347"
);
```

This lets off-chain services (the [notification indexer](indexer.md), content attesters, UIs) resolve content IDs back to actual URLs without needing a reverse-hash lookup.
