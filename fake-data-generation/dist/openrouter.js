/**
 * OpenRouter integration for LLM-based implication evaluation
 * Used by the generative testing suite to evaluate whether S1 implies S2
 */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Default model - using haiku for cost-effectiveness in testing
const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';
/**
 * Evaluate whether statement1 implies statement2 using an LLM
 */
async function evaluateImplicationWithLLM(statement1, statement2, apiKey, model = DEFAULT_MODEL) {
    if (!apiKey) {
        throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.');
    }
    const prompt = buildImplicationPrompt(statement1, statement2);
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://commonality.app',
                'X-Title': 'Commonality Generative Testing'
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
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenRouter API');
        }
        // Parse the JSON response
        let result;
        try {
            result = JSON.parse(content);
        }
        catch {
            // If JSON parsing fails, try to extract structured data from text
            result = extractResultFromText(content);
        }
        // Validate and normalize the result
        return {
            implies: result.implies === true || result.implies === 'true',
            confidence: normalizeConfidence(result.confidence),
            reasoning: result.reasoning || result.explanation || 'No reasoning provided',
            model: data.model || model,
            usage: data.usage || null
        };
    }
    catch (error) {
        const err = error;
        if (err.message.includes('API key')) {
            throw error;
        }
        console.error('Error calling OpenRouter:', error);
        // Return a conservative fallback result
        return {
            implies: false,
            confidence: 'low',
            reasoning: `Error during evaluation: ${err.message}. Defaulting to conservative "no implication" result.`,
            model: model,
            usage: null,
            error: err.message
        };
    }
}
/**
 * Build the prompt for implication evaluation
 */
function buildImplicationPrompt(statement1, statement2) {
    const s1Text = getStatementText(statement1);
    const s2Text = getStatementText(statement2);
    return `Evaluate whether Statement 1 logically implies Statement 2.

Statement 1: "${s1Text}"

Statement 2: "${s2Text}"

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
/**
 * Extract statement text from statement object
 */
function getStatementText(statement) {
    if (statement.content && typeof statement.content === 'object' && statement.content.text) {
        return statement.content.text;
    }
    if (statement.text) {
        return statement.text;
    }
    if (typeof statement.content === 'string') {
        return statement.content;
    }
    return JSON.stringify(statement);
}
/**
 * Normalize confidence value to standard format
 */
function normalizeConfidence(confidence) {
    if (typeof confidence === 'number') {
        if (confidence >= 0.8)
            return 'high';
        if (confidence >= 0.5)
            return 'medium';
        return 'low';
    }
    const normalized = String(confidence ?? '').toLowerCase().trim();
    if (['high', 'strong', 'certain', 'definite'].includes(normalized)) {
        return 'high';
    }
    if (['medium', 'moderate', 'somewhat', 'partial'].includes(normalized)) {
        return 'medium';
    }
    return 'low';
}
/**
 * Attempt to extract structured result from non-JSON text
 */
function extractResultFromText(text) {
    const lowerText = text.toLowerCase();
    let implies = false;
    if (lowerText.includes('"implies": true') ||
        lowerText.includes('implies: true') ||
        lowerText.includes('"implies": "true"') ||
        (lowerText.includes('yes') && lowerText.includes('implies'))) {
        implies = true;
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
/**
 * Get available models from OpenRouter (for reference)
 */
async function getAvailableModels(apiKey) {
    if (!apiKey) {
        throw new Error('OpenRouter API key is required');
    }
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }
        const data = await response.json();
        return data.data || [];
    }
    catch (error) {
        console.error('Error fetching models:', error);
        return [];
    }
}
/**
 * Batch evaluate multiple implication pairs
 */
async function batchEvaluateImplications(pairs, apiKey, model = DEFAULT_MODEL, options = {}) {
    const { delayMs = 1000, onProgress } = options;
    const results = [];
    for (let i = 0; i < pairs.length; i++) {
        const { statement1, statement2 } = pairs[i];
        try {
            const result = await evaluateImplicationWithLLM(statement1, statement2, apiKey, model);
            results.push({
                pairIndex: i,
                statement1Id: statement1.id ?? statement1.statementId,
                statement2Id: statement2.id ?? statement2.statementId,
                ...result
            });
            if (onProgress) {
                onProgress(i + 1, pairs.length, result);
            }
        }
        catch (error) {
            const err = error;
            results.push({
                pairIndex: i,
                statement1Id: statement1.id ?? statement1.statementId,
                statement2Id: statement2.id ?? statement2.statementId,
                error: err.message,
                implies: false,
                confidence: 'low',
                reasoning: `Error: ${err.message}`,
                model,
                usage: null
            });
        }
        // Rate limiting - delay between calls
        if (delayMs > 0 && i < pairs.length - 1) {
            await sleep(delayMs);
        }
    }
    return results;
}
/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export { evaluateImplicationWithLLM, batchEvaluateImplications, getAvailableModels, buildImplicationPrompt, DEFAULT_MODEL };
