# From funding one project to funding a whole ecosystem

Kickstarter already works. If you're looking at a *single* project and deciding whether to fund it, plain crowdfunding is fine — you don't need delegation, and you don't need at-cost reimbursement. You read the pitch, you decide, you pledge. [Assurance contracts](./assurance-contracts.md) (the "only charged if enough others join" mechanism) are a piece that Kickstarter already got right, and for one project at a time, that's most of the battle.

So why do we add the other machinery — [delegation](./delegation.md) and [retroactive funding](../why-its-better/retroactive-funding.md) that reimburses early contributors at cost? Not to make the "looking at this one project" story better. To make the **"funding an entire ecosystem"** story possible.

## The two features are ecosystem features

Both of our distinctive mechanisms only earn their keep once you stop looking at one project and start looking at thousands:

  - **Delegation** means *you* don't have to look at every project. Kickstarter assumes you'll personally evaluate each thing you back. That doesn't scale to an ecosystem of thousands of causes. Delegate to a friend you trust, and they look on your behalf.
  - **Retroactive funding** means your delegate doesn't have to look at every project *either*. A delegate can ignore unproven proposals and help close the reimbursement loops of projects that have *already* succeeded — letting results, not proposals, surface what's worth supporting. Those later donations reimburse early contributors pro rata, never beyond what each person put in.

Put those together and you've described something no single-project crowdfunding site can do: a way to point money at a sprawling landscape of public goods without anyone having to read every proposal. That capacity — surveying a whole ecosystem and steering funding toward the projects that deserve it — is exactly the job we currently hand to **government and big charities**. It's what makes Commonality a credible alternative to them rather than just a nicer Kickstarter.

## Why individual projects opt in anyway

Here's the elegant part: these are ecosystem-level features, but each one shows up as a feature an *individual* project has a selfish reason to adopt.

From a single project's point of view:

  - **"Early contributors can be reimbursed at cost after we deliver."**
  - **"Our public list of who-funded-us respects delegation chains."**

Neither of those sounds like grand civic infrastructure. They sound like two small product features — and a project adopts them because they each make early funding easier to attract. At-cost reimbursement gives scouts a reason to front donations for promising work: if later donors recognize the result, scouts can recover no more than they contributed and reuse that giving budget. Respecting delegation lets a project receive early support from people who will never personally evaluate it, but who trust someone who will.

That's the pitch to any individual project: **"Run your funding through this system, because it lets you raise money from people who don't want to do the work of vetting you in advance."** A project takes the deal for its own narrow reasons.

## The result, from a bird's-eye view

Now zoom back out. The ecosystem is full of individual projects, each having opted into delegation and at-cost reimbursement for its own practical reasons. But in aggregate, those two features are precisely what let funders — and funders' delegates — survey the whole landscape and route money efficiently toward proven results without inspecting everything by hand.

The features had to be built into the *individual-project* layer (one project's page respects delegation; one project's reimbursement contract records and caps each early contributor's claim), even though their real purpose is to make the *wider ecosystem* function. Recognition receipts are non-transferable, and reimbursement never includes interest, a premium, or a profit. That's the move that turns a crowdfunding tool into something that can do the job of government or a major foundation: looking out over the whole field of public goods and choosing what to support.
