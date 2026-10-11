# Initial prompt

Please read about our content-funding system, and about our whole system in general.

One use case I've got in mind for the content-funding system is something like: "let's make a way for donors to offer money to content creators for particular pieces of content *if* they aren't receiving ad revenue for that content."

IIUC, most of the major social-media platforms don't offer any way to turn off ad-based monetization per-post, and none of them offer any sort of publically-accessible API where third parties could verify that. So it seems like solving this problem might require creating an ad-free competitor to YouTube and X, which is a silly thing for us to attempt, but let's at least think through the idea.

If I wanted to suggest a way for a content creator to post a video online in some way that makes it *possible* for it to be freely shared (without ads), what's the bare minimum requirement? (e.g. Post the bytes on IPFS or BitTorrent or something?)

(The same is true for text posts, but text is a much easier problem.)

That is: I know that making a real "decentralized ad-free YouTube" would require all sorts of infrastructure in order to make it actually viable - various encodings, CDNs, etc. For now let's take it as a given that all of that will *eventually* be created. But as long as the content creator posts the bytes of the original video - without any ads baked into it or whatever - on IPFS or something, all of the rest of that work can in theory be done by anyone else, and then that content can be made available once that's done. The act that demonstrates the content creator's willingness to not-receive ad revenue is that he posts the raw video in a freely-available way (and keeps it up for long enough that it really does get actually copied and shared).

Of course, "without any ads baked into it" isn't as simple as not having any explicitly-marked ads interleaved into the video - e.g. content creators can and do do ads in the form of "let me tell you about the sponsor of today's episode..." So posting the raw video in a freely-shareable way isn't *sufficient* to guarantee no-ads, but it is *necessary*. And we could probably make an AI-based no-ads-attestation service that gets us most of the rest of the way.

(I mean, even that doesn't *really* work in an airtight way, because there's no way to know that the creator of, say, a "let's play this game" video isn't privately getting paid per click by the game's creator. But whatever, close enough for now.)

So the idea would be to create a very-simple protocol where anyone can post something (text or video or anything) online in a freely-shareable way (e.g. IPFS) with a digital signature attached, maybe ask the AI attester (for a tiny fee) to bless it as having no ads, and create a content contract to ask for funding for it. And then donors can (a) make sure the content has been copied (e.g. clone it to an IPFS pinning service they trust), and (b) contribute money to the content contract.

Does that make sense?


# Astra's response

Yes. **A creator can release everything needed for independent, ad-free distribution without anyone first building a YouTube competitor.** Your proposed funding flow makes sense.

I read the system overview, architecture, vision, and the content-funding specs covering creator contracts, canonicalization, and attesters. This fits Commonality’s approach particularly well: creators publish, independent services evaluate, donors or delegates choose what qualifies, and other people provide distribution.

One factual correction: YouTube **does** let creators [turn off monetization for individual videos](https://support.google.com/youtube/answer/6332943?hl=en). That is distinct from guaranteeing an ad-free viewing experience: YouTube documents [circumstances where ads appear on content the uploader hasn’t monetized](https://support.google.com/youtube/answer/2475463?hl=en). I haven’t established the broader claim about verification APIs across platforms.

**The bare minimum is a downloadable, usable copy plus permission to redistribute it.** For your signed, fundable protocol, I’d require:

1. **The complete media file.** A finished video at reasonable quality, without DRM or missing dependencies. It needn’t be camera-original footage or an editing project. Given that file, others can make additional encodings, streaming packages, thumbnails, and delivery infrastructure.
2. **An explicit redistribution license.** Publicly downloadable bytes alone don’t grant permission to mirror and distribute them. The grant should cover the hosting, copying, playback, and format conversion you want others to perform, and remain usable after the creator stops participating. For example, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) grants broad copying and adaptation rights, irrevocably subject to its conditions. It also permits commercial reuse, so it doesn’t prohibit someone else from putting ads around their copy. The creator must have the necessary rights to grant the license—including for incorporated material.
3. **A signed manifest identifying the release.** Bind the exact media hash/CID, license, creator identity, and intended beneficiary together. A signature establishes which key endorsed that release; linking the key to a known creator is a separate identity check.
4. **A completed handoff to independent storage.** Before funding, the donor or a trusted service actually retrieves and verifies the complete file and retains it.

IPFS is a reasonable transport for that, but **an HTTPS download plus a hash and signed manifest can satisfy the same initial requirement**. BitTorrent is another option. The important property is that recipients can obtain and preserve the complete work independently.

IPFS doesn’t make availability automatic: someone must retain and serve the content, generally by pinning it. A CID establishes content identity, not continued availability. Your “copy it to a pinning service I trust before contributing” step directly addresses that distinction. [IPFS persistence documentation](https://docs.ipfs.tech/concepts/persistence/)

I’d replace “keep it up for long enough” with a concrete handoff condition: **an independent recipient has successfully acquired and verified the complete release**. Continued availability then becomes the responsibility of whoever agrees to retain it. One copy is a minimal handoff; multiple independent copies provide greater resilience.

The main conceptual adjustment concerns what donors are buying. There are three different claims:

| Claim | What supports it |
|---|---|
| This work can be distributed and watched without platform-inserted ads | Usable bytes, redistribution permission, independent copies |
| This particular release contains no advertising or sponsorship segments | Inspection of those exact bytes, potentially by an AI attester |
| The creator receives no advertising-related money for this work anywhere | Additional disclosures and evidence; publication alone cannot establish it |

A creator could publish your clean, freely redistributable release and also monetize a YouTube edition. That doesn’t invalidate the public good they created, but it does mean **your proposal establishes willingness to enable ad-free access, rather than willingness to forgo all ad revenue**.

I think enabling ad-free access is already a strong funding criterion. It gives donors something concrete they can secure immediately, even while audience migration remains incomplete. If donors additionally want an undertaking not to monetize elsewhere, that can be a separate condition with its own evidence and trust requirements.

For the AI service, I’d make the attestation something like:

> “I inspected release H under advertising policy P and found no advertising.”

The policy can specify treatment of sponsorship reads, affiliate promotions, product placement, and the creator promoting their own work. The result should bind to the exact release and disclose inspection coverage; a transcript-only review cannot establish the absence of visual ads. Your private-payment caveat is exactly right, and the attestation should simply avoid claiming to establish that. Whether thorough video inspection costs a “tiny fee” remains something to measure.

Within Commonality, this looks like a modest extension of the existing design:

- Introduce a publication identity convention for signed releases, binding creator identity to immutable content.
- Let trusted attesters evaluate those releases against an ad-free-content statement.
- Let donors or delegates verify licensing and completed copying before contributing to the existing creator assurance contract.

The [content-funding spec](/specs/tech/subsystems/content-funding/README.md) already places the *reason for funding* in attestations rather than the funding contracts. That is the right separation here. The existing threshold/deadline mechanism doesn’t itself enforce licensing, storage, or no-ad judgments; those would initially be checks performed before contributing. Making payout conditional on later verification would be an additional mechanism.

The particularly useful feature of your idea is that **the funded result can be complete before the distribution ecosystem is mature**: a creator has released a usable, independently preserved, redistributable edition. Everyone building better viewing and distribution tools later can work from that edition without needing further cooperation from the creator.


# Me again

Just out of curiosity, to what extent do the necessary components of a decentralized YouTube already exist and can just be glued together, versus needing a major engineering effort?


# Astra

**Most of the video machinery already exists—and PeerTube already glues much of it together.** A useful ad-free video service is within reach through deployment and integration. A service with YouTube’s reliability, discovery, audience, and operating scale remains a major undertaking.

For your particular proposal, the gap is considerably smaller than “build decentralized YouTube.”

**PeerTube is the closest ready-made foundation.** It provides independently operated video sites that federate with one another, with uploads, channels, a web interface, and cross-server interactions. Its playback system combines ordinary HTTP delivery with browser-to-browser sharing. It already supports multiple resolutions and adaptive streaming. [Architecture](https://docs.joinpeertube.org/contribute/architecture), [video configuration](https://docs.joinpeertube.org/admin/configuration)

The component picture looks roughly like this:

| Requirement | What exists | What remains |
|---|---|---|
| Convert an uploaded video into playable resolutions | FFmpeg; PeerTube’s integrated transcoding | Choose quality settings, provision compute, handle failures |
| Adaptive streaming and browser playback | PeerTube’s HLS player | Deployment and device testing |
| Distribute bandwidth across hosts and viewers | PeerTube’s browser P2P and server mirroring | Recruit and operate dependable hosts |
| Scale beyond one server | PeerTube supports object storage, CDNs, and remote transcoding workers | Capacity planning, monitoring, operating costs |
| Independently preserve exact bytes | IPFS pinning and replication tools | Decide who retains what, for how long, and who pays |
| Signed releases, no-ad attestations, and Commonality funding | Your existing funding and attestation foundations | Build the publication convention and integration |

These are documented capabilities, rather than hypothetical combinations: [FFmpeg streaming formats](https://ffmpeg.org/ffmpeg-formats.html), [PeerTube scaling configuration](https://docs.joinpeertube.org/maintain/configuration), [remote workers](https://docs.joinpeertube.org/admin/remote-runners), [IPFS replication](https://docs.ipfs.tech/install/server-infrastructure/).

The important qualification is **what you mean by decentralized**.

If you mean “many independent operators can host videos and participate in a shared ecosystem,” PeerTube already implements that.

If you mean “a creator signs a release, and it remains identifiable, discoverable, and playable after their original hosting provider disappears,” there is more integration work. PeerTube’s documented architecture still has an origin server, server-based identities, and metadata services. Its redundancy feature copies video files to other instances, but those copies can be evicted according to cache policies. That is useful distribution infrastructure; it should not be treated as an archival guarantee. [PeerTube redundancy](https://docs.joinpeertube.org/admin/following-instances)

Your signed-manifest proposal addresses a valuable part of that second problem: the release’s identity and authorization can survive independently of the original website.

The harder remaining work falls into three buckets:

- **Durability and economics.** Someone must pay for storage, transcoding, and delivery—including videos almost nobody watches. Peer sharing helps when viewers overlap; it cannot replace a dependable source for the first viewer or an obscure old video. IPFS likewise requires somebody to retain the bytes. [IPFS persistence](https://docs.ipfs.tech/concepts/persistence/)
- **Reliable operation.** Recovering interrupted uploads, retrying failed conversions, replacing vanished mirrors, managing abuse, and keeping playback fast require continuing engineering and operations. Existing software supplies mechanisms; an operator still has to deliver the service.
- **Audience and discovery.** Search, recommendations, subscriptions, creator adoption, and viewers’ habits are a substantial product and coordination problem even once video playback works.

There is also one subtle piece of glue for your system: **an attested original and a streamed rendition have different hashes**. If someone converts an approved video into 720p, the original signature no longer directly authenticates the resulting bytes. Initially, you could trust a named transcoder that signs a mapping from original hash to rendition hashes. Supporting arbitrary, untrusted transcoders while detecting inserted ads or altered content is a more demanding problem.

My assessment of the effort would be:

- **A working community video site:** primarily deployment, configuration, and operations using PeerTube.
- **Your release → preserve → attest → fund workflow:** a bounded integration project, with meaningful custom work around identity, manifests, verification, and UX.
- **A network that automatically survives host failures and pays independent storage/transcoding operators:** substantial engineering, despite the available components.
- **A broadly competitive YouTube replacement:** a major sustained organization-building effort.

For Commonality, I’d therefore consider **a publishing and funding layer that works with PeerTube and independent archives**. A creator could publish a signed release, a donor could secure a copy, and an existing PeerTube operator could provide a perfectly usable viewing experience today. You wouldn’t need to wait for somebody to invent the playback and distribution stack; the main work would be connecting it to the guarantees donors care about.


# My thoughts

Okay, cool. That's good enough for now. We don't need to build this right away; it's enough for now to have it in mind as a potential add-on that could leverage the content-funding system into a way to decrease reliance on ads: "create content that's good in this particular way that we care about, and stop taking ad money, and we'll give you some money." No idea whether that's viable, but it'd be interesting to try.
