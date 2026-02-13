const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export async function evaluateImplicationWithLLM(statement1Content, statement2Content, apiKey, model = 'anthropic/claude-3.5-haiku') {
    const prompt = buildImplicationPrompt(statement1Content, statement2Content);
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://commonality.app',
            'X-Title': 'Commonality Implication Attester'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert in logical reasoning and statement analysis. Your job is to evaluate whether one statement logically implies another. Be conservative - only say "yes" if the implication is clear and direct.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('Empty response from OpenRouter API');
    }
    let result;
    try {
        result = JSON.parse(content);
    }
    catch {
        result = extractResultFromText(content);
    }
    return {
        implies: result.implies === true || result.implies === 'true',
        confidence: normalizeConfidence(result.confidence),
        reasoning: result.reasoning || result.explanation || 'No reasoning provided'
    };
}
function buildImplicationPrompt(statement1Content, statement2Content) {
    return `Evaluate whether Statement 1 logically implies Statement 2.

Statement 1: "${statement1Content}"

Statement 2: "${statement2Content}"

Does supporting Statement 1 necessarily mean supporting Statement 2?

Consider:
- Is Statement 2 a subset, consequence, or logical entailment of Statement 1?
- Would someone who agrees with Statement 1 necessarily agree with Statement 2?
- Are there cases where someone could support Statement 1 but not Statement 2?

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
function normalizeConfidence(confidence) {
    if (typeof confidence === 'number') {
        if (confidence >= 0.8)
            return 'high';
        if (confidence >= 0.5)
            return 'medium';
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
function extractResultFromText(text) {
    const lowerText = text.toLowerCase();
    let implies = false;
    if (lowerText.includes('"implies": true') ||
        lowerText.includes('implies: true') ||
        lowerText.includes('"implies": "true"') ||
        (lowerText.includes('yes') && lowerText.includes('implies'))) {
        implies = true;
    }
    else if (lowerText.includes('"implies": false') ||
        lowerText.includes('implies: false') ||
        lowerText.includes('"implies": "false"') ||
        lowerText.includes('does not imply')) {
        implies = false;
    }
    let confidence = 'low';
    if (lowerText.includes('high confidence') || lowerText.includes('"confidence": "high"')) {
        confidence = 'high';
    }
    else if (lowerText.includes('medium confidence') || lowerText.includes('"confidence": "medium"')) {
        confidence = 'medium';
    }
    return {
        implies,
        confidence,
        reasoning: text.slice(0, 500)
    };
}
//# sourceMappingURL=evaluator.js.map