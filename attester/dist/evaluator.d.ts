export interface LlmEvaluationResult {
    implies: boolean;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
}
export declare function evaluateImplicationWithLLM(statement1Content: string, statement2Content: string, apiKey: string, model?: string): Promise<LlmEvaluationResult>;
//# sourceMappingURL=evaluator.d.ts.map