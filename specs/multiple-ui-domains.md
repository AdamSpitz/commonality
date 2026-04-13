# Multiple UI domains

When people ask me "what have you been building?", or when trying to structure the [user-facing documentation](./docs/user-docs.md), it kinda seems like the right answer is NOT to describe this whole Commonality system in full generality, but rather to describe particular early use cases that feel compelling (and different ones will be compelling to different people).

So it may be that we're better off treating "Commonality" as backend infrastructure rather than "here's our big website called Commonality!" It can still have its own website, but the main thing we point people to should probably be sites like noninflammatory.xyz (or noninflammatory.eth.link) and common-sense-majority.eth.link, both of which say "built on top of commonality.eth.link".

Can we make sure that our UI code is structured in such a way that it's easy for us to build several entry points like that?


## AI's thoughts

My take is that the product instinct is good, but the document is still a note-to-self, not yet a spec.

The good part is the core framing: “Commonality” probably works better as infrastructure plus a family of use-case-specific frontends than as one giant generic destination. That matches how people actually adopt systems like this. It also fits the existing UI direction in [ui/README.md](/ui/README.md), which already treats the frontend as several logical apps rather than one undifferentiated surface.

What’s missing is the boundary of what “multiple UI domains” means technically. Right now the doc asks the right question, but it doesn’t answer it. I’d want it to pin down things like:
- Is this one deployable app with per-domain config, or several separately deployed apps sharing the same codebase?
- Which things vary by domain: branding, default landing page, enabled routes, statement/topic focus, copy, docs links, SEO metadata?
- What stays globally shared: wallet connection, account state, routing conventions, SDK queries, network config?
- Are these domains just different entry points into the same data, or can they intentionally hide most of the broader system?

The main risk is accidentally building “same app, different logo” when the real need is stronger product isolation. If `noninflammatory.xyz` is meant to feel like a focused product, that usually implies more than a different homepage. It may need domain-specific navigation, terminology, onboarding, and content curation. If you don’t decide that early, the UI can end up with a messy pile of conditionals.

I’d turn this into a short ADR-style spec with a concrete recommendation. My bias would be:
- One shared codebase.
- Domain-driven configuration.
- Per-domain app shell, metadata, copy, and route composition.
- Shared SDK/data layer and shared lower-level UI primitives.
- A clear notion of a “domain profile” object that selects product behavior.

That would preserve leverage while making it cheap to launch focused surfaces. Without that level of specificity, the current doc is directionally right but too underspecified to guide implementation.
