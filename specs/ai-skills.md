# AI skills

Think of the system as having two layers:
  - Basic primitives: writing statements, making attestations, making and buying and selling tokens, delegating funding decisions, etc.
  - AI skills for helping people do all of the above.

These skills can be loaded into systems like OpenClaw or Claude Code or whatever, to give people's personal AI assistants the ability to navigate our system and explain to the user how the system is meant to be used. e.g. The AI's job might be to find or write up a statement in conceptspace, after an interactive dialogue with the user to figure out what concept the user wants a statement for.

We'll write the skills ourselves and publish them (on clawdhub or wherever AI skills are published), although of course third parties can write their own and that's fine too.

I'll write up the basics here, and then probably ask AI to generate a more fleshed-out SKILL.md file for each of these.

## Skills we want to provide

### Statement finder/writer

  - (Include a description of what conceptspace is, what statements are, what implication attestations are.)
  - You may be called upon to:
    - Help your user understand what conceptspace is and why it's useful to have these implication attestations between statements.
    - Interact with your user to try to pinpoint a particular concept that he wants to express, then find an existing statement for it, or (if none exists) write one.
    - Follow the implication links to try to find a more-popular version of a statement. Advise your user on which version(s) of a concept might be best to sign.
    - Improve existing statements in various ways.
  - So instead of the user having to navigate the links himself (potentially requiring him to follow chains of many links, look carefully at which ones are more popular than others, wade through large numbers of similar statements, etc.), you can simply present him with a small number of choices (this one is more popular, that one is a slightly more-faithful representation of what you believe).

### Project discovery and evaluation

  - (Include a description of the funding portals system, alignment attestations, retroactive funding via resellable NFTs.)
  - You may be called upon to:
    - Help your user discover projects aligned with causes they care about, filtering through both directly and indirectly aligned projects.
    - Explain the difference between direct and indirect alignment (via implication chains).
    - Help your user evaluate whether a project truly aligns with a cause by analyzing the project description and the statement(s) it's aligned with.
    - Compare similar projects and help the user choose which ones to fund.
    - Analyze a project's funding progress, deadline, and whether it's on track to succeed.
    - Identify promising early-stage projects that might be good investment opportunities (for those interested in the retroactive funding/VC aspect).
    - Track the user's contribution history and suggest related causes or projects they might want to support.
  - This skill makes it easier for users to navigate the potentially-large number of projects without getting overwhelmed, and helps them make informed funding decisions aligned with their values.

### Delegation advisor

  - (Include a description of delegatable notes, composable delegation chains, revocation, transparency, and note intentions.)
  - You may be called upon to:
    - Help your user understand the delegation system and when it makes sense to use it versus making direct funding decisions.
    - Suggest trusted individuals who might be good delegates based on their track record (e.g. "this person has funded 15 projects aligned with your cause, and 80% of them reached their goals").
    - Help your user create and manage delegatable notes: setting amounts, specifying intentions (cause alignment), splitting/merging notes.
    - Explain delegation chains and help the user understand the full chain of trust when they see "Alice -> Bob -> Charlie funded this project".
    - Advise on when to revoke a delegation (e.g. if a delegate is making decisions the user disagrees with).
    - Help the user balance between delegating (less work) and maintaining control (more aligned with their specific preferences).
    - Suggest appropriate delegation strategies (e.g. "delegate 70% to a trusted expert, keep 30% for your own direct decisions").
  - This skill helps users leverage the power of composable delegation without needing to understand all the technical details, making the "nano-trustee" concept accessible to everyone.

### Funding strategy advisor

  - You may be called upon to:
    - Help investors understand the retroactive funding model: how to identify promising early projects, when to buy tokens, when to sell on the secondary market.
    - Help donors understand when to burn tokens (converting from investor to donor) for maximum social recognition and impact.
    - Analyze the secondary market for a project's tokens: current buy/sell orders, price trends, potential returns.
    - Suggest funding strategies based on the user's goals (maximize impact vs. maximize returns vs. balance both).
    - Help users understand the trade-offs between different project token types (if a project has multiple tiers/token types).
    - Advise on portfolio diversification: "you've funded 5 journalism projects; consider diversifying into technical projects or other categories".
    - Track market opportunities: "these tokens you bought early are now worth 3x; several donors are looking to buy them".
  - This skill bridges the gap between traditional VC/investment thinking and public goods funding, making the system useful for both altruistic donors and strategic investors.

### Cause discovery and coalition building

  - You may be called upon to:
    - Help users discover causes and statements that align with their values through interactive dialogue.
    - Identify commonality between different causes/statements the user supports (e.g. "statements S1 and S2 that you've signed both imply this more general statement S").
    - Suggest coalition opportunities: "100 people believe S1, 80 people believe S2, and there's a commonality statement S that both groups might rally around".
    - Help users understand the implication graph: "this statement is implied by 5 other statements, giving it broad indirect support".
    - Identify trending causes (velocity of new signatures) that the user might be interested in based on their existing beliefs.
    - Suggest high-profile signers and influencers who support the same causes, enabling users to connect with like-minded communities.
    - Help users formulate "umbrella statements" that can unite multiple related but distinct beliefs.
  - This skill helps users navigate the social/political landscape of causes and build larger coalitions, making the system more effective at coordinating aligned people.

### Attester management and trust configuration

  - You may be called upon to:
    - Help users understand what implication attesters are and why multiple attesters might exist.
    - Explain the trade-offs of different attesters (e.g. "Attester A is conservative and only creates implications for very similar statements; Attester B is more aggressive and finds broader connections").
    - Help users configure their trusted attesters in settings based on their preferences for strictness vs. inclusiveness.
    - Alert users when an attester they trust makes an implication that seems questionable, allowing them to review and potentially switch attesters.
    - Explain how non-transitive implications work and why this design choice was made.
    - Help users understand the impact of attester choice: "if you trust Attester A instead of B, statement S would have 50 fewer indirect supporters".
  - This skill helps users navigate the subjective nature of implication relationships and configure the system to match their personal preferences.

### Social verification and identity linking

  - (Include description of linking social accounts, unique-human verification, high-profile signers.)
  - You may be called upon to:
    - Help users link their Twitter/other social accounts to their Commonality profile for verification and social proof.
    - Explain the benefits of verification: appearing as a high-profile signer, building trust for delegation, social recognition for contributions.
    - Guide users through privacy-preserving unique-human verification options (when implemented: Worldcoin, BrightID, etc.).
    - Help users understand the privacy implications of different verification methods.
    - Identify high-profile signers for causes the user cares about, facilitating "spreading up the popularity hierarchy".
    - Suggest outreach strategies for getting influencers to sign statements or fund projects.
  - This skill makes the social/viral aspects of the system more accessible and helps users leverage social proof effectively.

### Project creation assistant

  - You may be called upon to:
    - Help users create well-structured crowdfunding projects: writing compelling descriptions, choosing appropriate funding goals and deadlines.
    - Guide users through technical setup: creating the ERC-1155 contract, defining token types/tiers, setting up assurance contract parameters.
    - Help users create alignment attestations for their project: identifying the most relevant statements to align with.
    - Suggest which statements to align with based on available delegatable notes (funding availability).
    - Advise on project strategy: assurance contract vs. continuous funding, single vs. multiple token types, pricing strategies.
    - Help users create project metadata and descriptions that will be well-received by both donors and investors.
    - Generate project progress updates and communications to contributors.
  - This skill lowers the barrier to entry for project creators and helps them set up projects in ways that maximize their chances of success.

### Analytics and insights

  - You may be called upon to:
    - Provide personalized analytics: "you've signed 15 statements supporting 3 main causes; you've funded 8 projects with $500 total".
    - Show impact metrics: "projects you funded early have collectively raised $50k; 3 have reached their goals".
    - Identify patterns: "donors who signed statement S typically also fund projects in categories X and Y".
    - Suggest actions based on user behavior: "you signed statement S two weeks ago but haven't explored its funding portal yet".
    - Provide ecosystem-wide insights: "this cause has gained 200 new supporters this month; funding for aligned projects is up 40%".
    - Track ROI for investors: "your early investment in Project P has appreciated 2.5x; here's the current market".
    - Identify underserved causes: "statement S has 500 supporters but only 2 aligned projects; opportunity for creators".
  - This skill helps users understand their impact and discover opportunities, making the system more engaging and effective.

### Onboarding and education

  - You may be called upon to:
    - Provide personalized onboarding experiences for new users, explaining concepts progressively rather than all at once.
    - Adapt explanations based on user background: explain differently to someone familiar with crypto vs. someone new to it.
    - Create interactive tutorials: "let's create your first statement together", "let's fund a small project to see how it works".
    - Answer questions about system mechanics: "what happens if a project doesn't reach its goal?", "can I get a refund?".
    - Explain the philosophy behind design choices: "why are implications non-transitive?", "why resellable NFTs instead of regular donations?".
    - Suggest next steps for users at different stages of engagement.
    - Provide use-case examples relevant to the user's interests.
  - This skill is crucial for adoption, making the system accessible to people who aren't crypto-native or familiar with the concepts.

### Watchdog and notification system

  - You may be called upon to:
    - Monitor causes the user cares about and notify them of important events: new projects aligned with their causes, projects approaching deadlines, funding goals reached.
    - Alert users when statements they've signed gain significant new support or when high-profile signers join.
    - Notify users about their delegations: "your delegate just funded a new project", "your delegate is inactive; consider switching".
    - Track market opportunities for investors: "tokens you hold now have active buyers", "project you invested in early is gaining traction".
    - Alert users about controversial implications: "an attester you trust just linked two statements that seem unrelated; you may want to review".
    - Notify users about governance/system events if applicable.
    - Provide personalized digest summaries: "here's what happened in your causes this week".
  - This skill keeps users engaged without requiring constant monitoring, making the system more practical for busy people.

### what else?

What other AI skills would be useful for our system? (This is a living document; add more ideas as they emerge.)
