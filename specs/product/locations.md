# Location self-attestations

> Is there already some existing way in the Ethereum ecosystem for people to (very simply) declare where they live (to varying degrees of precision - I don't want street addresses, just which neighbourhood or which city)?
> 
> If not, how could such a thing be implemented? Is there a natural/standard way of representing fuzzy locations, so that it would be possible to (for example) show a map of how many accounts have declared themselves to be in which areas, or do a search to find accounts that have declared themselves to be in some particular area?


Good, I have enough to give a solid answer. Let me also check H3 resolution table for the city/neighbourhood sizes.Great, I have everything I need. Here's a comprehensive answer:

## Existing ecosystem: not really

There's no standard Ethereum primitive for self-declared location. You'll find bits of adjacent infrastructure — ENS lets you put arbitrary text records on a name, and projects like Gitcoin Passport or Worldcoin deal with identity claims — but nobody has standardized "where I live" as a first-class attestation. It's a genuine gap.

## The right building blocks

**For the attestation layer: EAS (Ethereum Attestation Service)**

EAS is an infrastructure public good for making attestations onchain or offchain about anything. It's public good, open-source, permissionless, and token-free. The model is: you define a *schema* (a typed struct describing what a particular kind of attestation contains), then anyone can make an attestation against that schema, signing it with their wallet. EAS leverages EIP-712 for signing, and attestations can be made onchain or kept offchain with just a hash anchored on-chain — the latter is useful when you don't want to expose data like private location details.

A location schema might just be: `uint64 h3Index, uint8 resolution`. That's it — 9 bytes that encode a fuzzy location to whatever precision the user chooses.

**For the location encoding: H3 hexagons**

This is where it gets elegant. H3 is a hierarchical hexagonal geospatial indexing system. Cell IDs are 64-bit integers, which fits neatly into a `uint64` in Solidity. The hierarchy is the key feature for your use case: a user picks a *resolution* that determines how fuzzy their location is.

The resolutions that matter for your use case (from the H3 docs):

| Resolution | Avg area | Human scale |
|---|---|---|
| 3 | ~12,000 km² | large region / province |
| 5 | ~253 km² | metro area |
| 6 | ~36 km² | city |
| 7 | ~5 km² | large borough/arrondissement |
| 8 | ~0.7 km² | neighbourhood |
| 9 | ~0.1 km² | few city blocks |

The hexagonal shape means every cell has exactly 6 edge-sharing neighbours — no corner-sharing ambiguity, which makes proximity queries clean. Finding all accounts "near" a given hex is just fetching the hex's neighbours at the chosen resolution tier.

The critical property for your use case: **the hex ID at a coarser resolution is derivable from a finer one**. If a user declares themselves at resolution 7, you can aggregate them at resolution 5 (city) or 3 (region) purely by arithmetic on the index. No separate data needed. Every hexagon at a lower resolution contains exactly 7 hexagons at resolution n+1.

## How you'd implement it

**Schema registration on EAS** (one-time):
```
string schemaId = register("uint64 h3Index, uint8 resolution, string label")
```

`label` is optional human-readable context ("Rosedale", "Grey County") — you don't *need* it since the hex boundary is already defined, but it's nice UX.

**Making an attestation** (user action):
- User visits a dapp, picks a location on a map at whatever zoom level they're comfortable with
- The UI calls `h3.latLngToCell(lat, lng, chosenResolution)` to get the index
- The user signs an EAS attestation with that index + resolution
- They can do this offchain (just a signed message, gas-free) with only the hash stored onchain, or fully onchain if you want composability

**Querying / mapping**:
- Pull all attestations for the schema from the EAS GraphQL API
- Group by h3Index (or by `h3.cellToParent(index, displayResolution)` to aggregate at a common zoom level)
- Feed into a Deck.gl H3Layer or similar — this is exactly what Uber designed H3 for, and the tooling is mature

**Privacy knobs** the user controls:
- Resolution choice (resolution 5 = "I'm in the Toronto metro", resolution 8 = "I'm in Leslieville")
- Offchain vs onchain attestation
- Can revoke or update any time via EAS's revocation mechanism

## The design question worth thinking about

Since this is self-declared, you get a spectrum from "useful social signal" to "gameable noise" depending on what it's for. For something like finding nearby homesteaders or local community members (which sounds like the spirit of what you're after), self-declaration is probably fine — people have no incentive to lie about being in Grey County. If it were gating some resource, you'd want to layer in a verifier (e.g. a trusted attestor, or a ZK proof from a government ID), but EAS supports that extension without changing the schema.

The EAS explorer at easscan.org is worth a look — it lets you browse existing schemas and attestations, and you could prototype the whole thing without writing a line of Solidity.