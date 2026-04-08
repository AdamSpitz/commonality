import { OpenRouterInvalidJsonError, requestJsonCompletion } from '@commonality/attester-core';
export async function evaluateContentWithLLM(params) {
    const prompt = buildContentAttesterPrompt(params.promptTemplate, params.content, params.declaredPerspective);
    let result;
    try {
        result = await requestJsonCompletion({
            apiKey: params.apiKey,
            model: params.model ?? 'anthropic/claude-3.5-haiku',
            systemPrompt: 'You are a careful content attester. Return valid JSON only. Be conservative and avoid false positives.',
            userPrompt: prompt,
            title: `Commonality ${params.attesterName}`,
        });
    }
    catch (error) {
        if (error instanceof OpenRouterInvalidJsonError) {
            result = extractResultFromText(error.content);
        }
        else {
            throw error;
        }
    }
    return {
        decision: result.decision === true || result.decision === 'true',
        confidence: normalizeConfidence(result.confidence),
        reasoning: (typeof result.reasoning === 'string' && result.reasoning) ||
            (typeof result.explanation === 'string' && result.explanation) ||
            'No reasoning provided',
        dimensions: normalizeDimensions(result.dimensions),
    };
}
export function buildContentAttesterPrompt(promptTemplate, content, declaredPerspective) {
    const perspectiveContext = declaredPerspective
        ? `Declared perspective from the submitter: ${declaredPerspective}`
        : 'No declared perspective was provided.';
    return promptTemplate
        .replaceAll('{content}', content)
        .replaceAll('{declared_perspective_context}', perspectiveContext);
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
function normalizeDimensions(dimensions) {
    if (!dimensions || typeof dimensions !== 'object' || Array.isArray(dimensions)) {
        return {};
    }
    const normalized = {};
    for (const [key, value] of Object.entries(dimensions)) {
        const score = String(value).toLowerCase().trim();
        if (score === 'pass' || score === 'fail' || score === 'partial') {
            normalized[key] = score;
        }
    }
    return normalized;
}
function extractResultFromText(text) {
    const lowerText = text.toLowerCase();
    const decision = lowerText.includes('"decision": true') ||
        lowerText.includes('decision: true') ||
        lowerText.includes('"decision": "true"');
    let confidence = 'low';
    if (lowerText.includes('high confidence') || lowerText.includes('"confidence": "high"')) {
        confidence = 'high';
    }
    else if (lowerText.includes('medium confidence') || lowerText.includes('"confidence": "medium"')) {
        confidence = 'medium';
    }
    return {
        decision,
        confidence,
        reasoning: text.slice(0, 500),
    };
}
//# sourceMappingURL=evaluator.js.map