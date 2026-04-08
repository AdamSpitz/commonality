export declare class OpenRouterInvalidJsonError extends Error {
    readonly content: string;
    constructor(content: string);
}
export interface OpenRouterJsonRequest {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    referer?: string;
    title?: string;
    temperature?: number;
    maxTokens?: number;
}
export declare function requestJsonCompletion<T>(request: OpenRouterJsonRequest): Promise<T>;
//# sourceMappingURL=openrouter.d.ts.map