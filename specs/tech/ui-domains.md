# Multi-Domain UI Architecture

The eight UI domains (Commonality, Pubstarter, Alignment, Tally, Content Funding, Noninflammatory Content, Common Sense Majority, Conceptspace) are built from a single codebase but deployed as separate artifacts. For the product-level description of what each site is and why they exist, see [specs/product/ui-domains.md](../product/ui-domains.md).


## Shared codebase, separate builds

All eight sites share:
- SDK code and blockchain interactions
- UI component library and design primitives
- Authentication and wallet infrastructure
- Attestation display components

Each site is a separate build artifact that includes only the routes and features relevant to it. A `VITE_DOMAIN` environment variable selects which domain is built; it defaults to `commonality`.


## Directory shape

```
ui/src/
├── shared/                    # Shared SDK, components, hooks, routing, branding helpers
├── conceptspace/              # Statement-signing feature module (used by Tally)
├── pubstarter/                # Project/funding feature module (used by Pubstarter and verticals)
├── delegation/                # Delegation feature module (used by Alignment and verticals)
├── fundingportal/             # Funding portal feature module (used by Alignment, Tally, and verticals)
├── content-funding/           # Shared content-funding base
├── domains/                   # Per-domain manifests, landing pages, route composition
│   ├── commonality/
│   ├── pubstarter/
│   ├── alignment/
│   ├── tally/
│   ├── content-funding/
│   ├── noninflammatory/
│   ├── csm/
│   └── conceptspace/
└── main.tsx                   # Selects the active domain build via VITE_DOMAIN
```

Each domain folder under `domains/` contains its manifest (branding, shell/nav config, included feature modules, route table) and landing page. The feature modules under `src/conceptspace`, `src/pubstarter`, etc. are shared; the domain manifests compose them.


## Build outputs

```
dist/
├── commonality/
├── pubstarter/
├── alignment/
├── tally/
├── content-funding/
├── noninflammatory/
├── csm/
└── conceptspace/
```

Useful build commands (from the `ui/` directory):

```
npm run build              # builds the active domain (VITE_DOMAIN, defaults to commonality)
npm run build:domains      # builds all eight domains in one pass
npm run build:ipfs         # builds active domain in hash-routing mode for IPFS deployment
npm run build:ipfs:domains # builds all eight domains in IPFS mode
```


## Deployment (local docker-compose)

The docker-compose stack includes eight one-shot publisher services, one per domain, that run in parallel:

- `ui-ipfs-publisher-commonality`
- `ui-ipfs-publisher-pubstarter`
- `ui-ipfs-publisher-alignment`
- `ui-ipfs-publisher-tally`
- `ui-ipfs-publisher-content-funding`
- `ui-ipfs-publisher-noninflammatory`
- `ui-ipfs-publisher-csm`
- `ui-ipfs-publisher-conceptspace`

Each service builds its domain in IPFS/hash-routing mode, pins the resulting directory to the local IPFS node, and writes its CID and gateway URL to `./data/ui-ipfs/<domain>/`. Running `./scripts/services.sh --url` prints the gateway URLs for all eight domains.
