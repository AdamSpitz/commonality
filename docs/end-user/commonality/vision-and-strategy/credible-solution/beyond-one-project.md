# From funding one project to funding a whole ecosystem

Kickstarter already works. If you're looking at a *single* project and deciding whether to fund it, plain crowdfunding is fine — you don't need delegation, and you don't need resellable shares. You read the pitch, you decide, you pledge. [Assurance contracts](./assurance-contracts.md) (the "only charged if enough others join" mechanism) are a piece that Kickstarter already got right, and for one project at a time, that's most of the battle.

So why do we add the other machinery — [delegation](./delegation.md) and resellable, [retroactively-fundable](../why-its-better/retroactive-funding.md) shares? Not to make the "looking at this one project" story better. To make the **"funding an entire ecosystem"** story possible.

## The two features are ecosystem features

Both of our distinctive mechanisms only earn their keep once you stop looking at one project and start looking at thousands:

  - **Delegation** means *you* don't have to look at every project. Kickstarter assumes you'll personally evaluate each thing you back. That doesn't scale to an ecosystem of thousands of causes. Delegate to a friend you trust, and they look on your behalf.
  - **Resellable shares (retroactive funding)** mean your delegate doesn't have to look at every project *either*. Because contributions are resellable shares rather than sunk donations, a delegate can ignore unproven proposals entirely and just fund the projects that have *already* succeeded — letting results, not proposals, surface what's worth funding.

Put those together and you've described something no single-project crowdfunding site can do: a way to point money at a sprawling landscape of public goods without anyone having to read every proposal. That capacity — surveying a whole ecosystem and steering funding toward the projects that deserve it — is exactly the job we currently hand to **government and big charities**. It's what makes Commonality a credible alternative to them rather than just a nicer Kickstarter.

## Why individual projects opt in anyway

Here's the elegant part: these are ecosystem-level features, but each one shows up as a feature an *individual* project has a selfish reason to adopt.

From a single project's point of view:

  - **"Our funding is represented as resellable shares."**
  - **"Our public list of who-funded-us respects delegation chains."**

Neither of those sounds like grand civic infrastructure. They sound like two small product features — and a project adopts them because they each *attract more funding*. Resellable shares let you collect from people who would never fund a promising-but-unproven pitch but will happily pay in *after* you've proven yourself. Respecting delegation lets you collect from people who'll never personally evaluate you, but who trust someone who will.

That's the pitch to any individual project: **"Run your funding through this system, because it lets you raise money from people who don't want to do the work of vetting you in advance."** A project takes the deal for its own narrow reasons.

## The result, from a bird's-eye view

Now zoom back out. The ecosystem is full of individual projects, each having opted into delegation-awareness and share-reselling for its own selfish reasons. But in aggregate, those two features are precisely what let funders — and funders' delegates — survey the whole landscape and route money efficiently toward proven results without inspecting everything by hand.

The features had to be built into the *individual-project* layer (one project's page respects delegation; one project's tokens can be resold), even though their real purpose is to make the *wider ecosystem* function. That's the move that turns a crowdfunding tool into something that can do the job of government or a major foundation: looking out over the whole field of public goods and choosing what to fund.
