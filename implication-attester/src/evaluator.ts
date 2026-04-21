import { OpenRouterInvalidJsonError, requestJsonCompletion } from '@commonality/attester-core';

export interface LlmEvaluationResult {
  implies: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function evaluateImplicationWithLLM(
  statement1Content: string,
  statement2Content: string,
  apiKey: string,
  model: string = 'anthropic/claude-3.5-haiku'
): Promise<LlmEvaluationResult> {
  const prompt = buildImplicationPrompt(statement1Content, statement2Content);
  let result: Record<string, unknown>;
  try {
    result = await requestJsonCompletion<Record<string, unknown>>({
      apiKey,
      model,
      systemPrompt:
        'You are an expert in logical reasoning and statement analysis for Commonality, a platform for collective funding of public goods. ' +
        'Your job is to evaluate whether one statement logically implies another. ' +
        'Be conservative — only say "yes" if the implication is clear and direct. ' +
        'Statements often describe interests in topics, geographic regions, or combinations of both.',
      userPrompt: prompt,
      title: 'Commonality Implication Attester',
    });
  } catch (error) {
    if (error instanceof OpenRouterInvalidJsonError) {
      result = extractResultFromText(error.content);
    } else {
      throw error;
    }
  }

  return {
    implies: result.implies === true || result.implies === 'true',
    confidence: normalizeConfidence(result.confidence),
    reasoning:
      (typeof result.reasoning === 'string' && result.reasoning) ||
      (typeof result['explanation'] === 'string' && result['explanation']) ||
      'No reasoning provided',
  };
}

function buildImplicationPrompt(statement1Content: string, statement2Content: string): string {
  return `Evaluate whether Statement 1 logically implies Statement 2.

Statement 1: "${statement1Content}"

Statement 2: "${statement2Content}"

Does supporting Statement 1 necessarily mean supporting Statement 2?

Consider:
- Is Statement 2 a subset, consequence, or logical entailment of Statement 1?
- Would someone who agrees with Statement 1 necessarily agree with Statement 2?
- Are there cases where someone could support Statement 1 but not Statement 2?

Geographic × topical intersection patterns:
Statements may combine a geographic interest with a topical interest (e.g., "I'm interested in crypto in Ontario").
A conjunction statement like this implies BOTH of its parents:
  - "I'm interested in crypto in Ontario" → "I'm interested in crypto" (topical parent)
  - "I'm interested in crypto in Ontario" → "I care about improving Ontario" (geographic parent)
The reverse implications do NOT hold:
  - "I'm interested in crypto" does NOT imply "I'm interested in crypto in Ontario"
  - "I care about improving Ontario" does NOT imply "I'm interested in crypto in Ontario"
A person interested in crypto generally should not be nudged toward crypto-in-Ontario projects, and a person interested in Ontario generally should not be nudged toward crypto-in-Ontario projects. They only care about the intersection if they signed the conjunction.

Geographic hierarchy patterns:
Statements at different geographic levels form a hierarchy (town → county → province → country).
A narrower geographic statement implies a broader one:
  - "I care about improving Grey County" → "I care about improving Ontario"
  - "I care about improving Ontario" → "I care about improving Canada"
The reverse does NOT hold — caring about Canada does not imply caring about any specific province.

Respond in JSON format with this structure:
{
  "implies": true/false,
  "confidence": "high" | "medium" | "low",
  "reasoning": "2-4 sentences explaining your reasoning"
}

Use "high" confidence only for clear, direct logical implications.
Use "medium" confidence for probable but not certain implications.
Use "low" confidence for weak or uncertain connections.
Be conservative - when in doubt, say "implies": false.`;
}

function normalizeConfidence(confidence: unknown): 'high' | 'medium' | 'low' {
  if (typeof confidence === 'number') {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }
  
  const normalized = String(confidence).toLowerCase().trim();
  if (['high', 'strong', 'certain', 'definite'].includes(normalized)) {
    return 'high';
  }
  if (['medium', 'moderate', 'somewhat', 'partial'].includes(normalized)) {
    return 'medium';
  }
  return 'low';
}

function extractResultFromText(text: string): Record<string, unknown> {
  const lowerText = text.toLowerCase();
  
  let implies = false;
  if (lowerText.includes('"implies": true') || 
      lowerText.includes('implies: true') ||
      lowerText.includes('"implies": "true"') ||
      (lowerText.includes('yes') && lowerText.includes('implies'))) {
    implies = true;
  } else if (lowerText.includes('"implies": false') || 
             lowerText.includes('implies: false') ||
             lowerText.includes('"implies": "false"') ||
             lowerText.includes('does not imply')) {
    implies = false;
  }
  
  let confidence: string = 'low';
  if (lowerText.includes('high confidence') || lowerText.includes('"confidence": "high"')) {
    confidence = 'high';
  } else if (lowerText.includes('medium confidence') || lowerText.includes('"confidence": "medium"')) {
    confidence = 'medium';
  }
  
  return {
    implies,
    confidence,
    reasoning: text.slice(0, 500)
  };
}
