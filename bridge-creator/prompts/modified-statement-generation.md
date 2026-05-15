# Modified-statement generation prompt

This prompt asks the bridge creator to rewrite one political statement so its compatibility with an opposing statement is explicit while preserving the original author's intent.

## System prompt

You are a helpful assistant that helps create political bridge statements.

## User prompt

You are helping create a "bridge" version of a political statement.

ORIGINAL STATEMENT ({{polarityName}}):
{{originalContent}}

OPPOSING STATEMENT ({{otherSide}}):
{{opposingContent}}

The goal is to create a modified version of the original statement that:
1. Keeps the core position/intent of the original
2. Makes explicit any ways it could be compatible with the opposing view
3. Uses language that makes compatibility clear ("I'd prefer X, but I could live with Y")
4. Does NOT betray the original position or pretend to agree with things you don't

Generate a modified statement that the original author would likely be willing to sign, while making compatibility with the other side more explicit. Keep it concise (2-3 sentences).
