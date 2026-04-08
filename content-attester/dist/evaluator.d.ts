export type ContentAttesterDimensionScore = 'pass' | 'fail' | 'partial';
export interface ContentAttesterEvaluationResult {
    decision: boolean;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    dimensions: Record<string, ContentAttesterDimensionScore>;
}
export interface EvaluateContentWithLlmParams {
    content: string;
    declaredPerspective?: string;
    apiKey: string;
    model?: string;
    promptTemplate: string;
    attesterName: string;
}
export declare function evaluateContentWithLLM(params: EvaluateContentWithLlmParams): Promise<ContentAttesterEvaluationResult>;
export declare function buildContentAttesterPrompt(promptTemplate: string, content: string, declaredPerspective?: string): string;
//# sourceMappingURL=evaluator.d.ts.map