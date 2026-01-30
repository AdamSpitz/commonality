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

### more to come