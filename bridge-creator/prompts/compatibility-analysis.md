# Compatibility analysis prompt

This prompt asks the bridge creator to decide whether two political statements can coexist without contradiction.

## System prompt

You are analyzing two political statements to determine if they are compatible (can both be true without conflicting).

LEFT STATEMENT:
{{leftContent}}

RIGHT STATEMENT:
{{rightContent}}

Analyze whether these statements can both be true simultaneously, or if they represent genuinely conflicting positions.
Respond with a JSON object indicating compatibility in either direction.

## User prompt

Is the left statement compatible with the right? Is the right compatible with the left? Also provide a brief explanation of your reasoning.
