You are evaluating whether a piece of political content is noninflammatory — that is, whether it communicates its perspective in a way that people who disagree could engage with without feeling attacked or contemptuous.

# What you are NOT evaluating

You are NOT evaluating whether the content is correct, whether you agree with it, or whether it is "balance d." Strongly opinionated content can be noninflammatory. The question is not "is this centrist?" but "is this written in a way that invites engagement rather than defensiveness?"

You are also NOT evaluating politeness. Content can be blunt, direct, even passionate — and still noninflammatory. The question is whether it treats people who disagree as reasonable humans who might have reasons for their views, not whether it uses soft language.

# Evaluation criteria

Evaluate the content on these dimensions:

1. **Steelmanning vs. strawmanning**: Does the content represent opposing views fairly? It doesn't need to agree with them, but it should engage with the strongest version of the opposing argument, not a caricature.

2. **Contempt and dehumanization**: Does the content express contempt for people (not ideas) who hold opposing views? Criticizing ideas is fine; treating the humans who hold those ideas as stupid, evil, or subhuman is inflammatory.

3. **Ad hominem and mockery**: Does the content attack the character or intelligence of its opponents rather than engaging with their arguments? Humor is fine; humor that exists to humiliate is not.

4. **Tribal signaling vs. persuasion**: Is the content primarily designed to signal in-group identity and rally people who already agree? Or does it make a case that could reach someone who doesn't already share its premises? Content that is *only* comprehensible or appealing to people who already agree is not noninflammatory — it's just preaching to the choir.

5. **Emotional manipulation**: Does the content use fear, outrage, or disgust as a *substitute* for argument? Using emotion to *illustrate* a point is fine (e.g., telling a compelling story). Using emotion to bypass critical thinking is inflammatory.

# The key question

Ask yourself: **If I handed this to a thoughtful, open-minded person who holds the opposing political view, would they feel that the author took their perspective seriously — even if the author ultimately disagrees?**

If yes → noninflammatory.
If no → inflammatory.
If borderline → lean toward "no." False positives (attesting inflammatory content as noninflammatory) are worse than false negatives.

# Content to evaluate

{content}

{declared_perspective_context}

# Task

Evaluate whether this content is noninflammatory.

Respond with a JSON object:
{
  "decision": true or false,
  "confidence": "high" | "medium" | "low",
  "reasoning": "2-4 sentence explanation of your evaluation",
  "dimensions": {
    "steelmanning": "pass" | "fail" | "partial",
    "contempt": "pass" | "fail" | "partial",
    "ad_hominem": "pass" | "fail" | "partial",
    "tribal_signaling": "pass" | "fail" | "partial",
    "emotional_manipulation": "pass" | "fail" | "partial"
  }
}

Be concise but specific in your reasoning. Cite specific phrases or passages that informed your evaluation.