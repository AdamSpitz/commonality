# Multiple UI domains

When people ask me "what have you been building?", or when trying to structure the [user-facing documentation](./docs/user-docs.md), it kinda seems like the right answer is NOT to describe this whole Commonality system in full generality, but rather to describe particular early use cases that feel compelling (and different ones will be compelling to different people).

So it may be that we're better off treating "Commonality" as backend infrastructure rather than "here's our big website called Commonality!" It can still have its own website, but the main thing we point people to should probably be sites like noninflammatory.xyz (or noninflammatory.eth.link) and common-sense-majority.eth.link, both of which say "built on top of commonality.eth.link".

Can we make sure that our UI code is structured in such a way that it's easy for us to build several entry points like that?

(This fits the existing UI direction in [ui/README.md](/ui/README.md), which already treats the frontend as several logical apps rather than one undifferentiated surface.)

Let's have the UI code build several different artifacts from the same code base. Different branding, different landing page, different routes, etc. (e.g. The noninflammatory-content site can focus just on content contracts, not on arbitrary pubstarter contracts.) But they can still use the same sdk code and dependencies and lower-level UI primitives and so on.

