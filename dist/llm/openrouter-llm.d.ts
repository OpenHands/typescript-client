/**
 * OpenRouter LLM implementation
 *
 * This implements the ILLM interface using the OpenRouter SDK,
 * providing access to 300+ models through a unified API.
 */
import type { ILLM, BaseLLMOptions, ChatCompletionOptions, ChatCompletionResponse, ChatCompletionChunk, TokenCallbackType } from './base';
/**
 * Options for creating an OpenRouterLLM instance
 */
export interface OpenRouterLLMOptions extends BaseLLMOptions {
    /** Site URL for rankings on openrouter.ai (optional) */
    siteUrl?: string;
    /** Site title for rankings on openrouter.ai (optional) */
    siteTitle?: string;
}
/**
 * OpenRouter LLM implementation using the official @openrouter/sdk.
 *
 * Provides access to 300+ AI models through OpenRouter's unified API.
 *
 * Example:
 * ```typescript
 * const llm = new OpenRouterLLM({
 *   apiKey: 'your-api-key',
 *   defaultModel: 'anthropic/claude-3.5-sonnet'
 * });
 *
 * const response = await llm.generate('Hello, how are you?');
 * console.log(response);
 *
 * // Or with full control:
 * const completion = await llm.chatCompletion({
 *   messages: [{ role: 'user', content: 'Explain quantum computing' }],
 *   temperature: 0.7,
 *   maxTokens: 1000
 * });
 * ```
 */
export declare class OpenRouterLLM implements ILLM {
    private client;
    readonly defaultModel: string;
    private readonly defaultTemperature?;
    private readonly defaultMaxTokens?;
    constructor(options: OpenRouterLLMOptions);
    /**
     * Convert our ChatMessage format to OpenRouter's format
     */
    private convertMessages;
    /**
     * Convert our Tool format to OpenRouter's format
     */
    private convertTools;
    /**
     * Build the common request parameters shared by chatCompletion and chatCompletionStream.
     */
    private buildRequestParams;
    chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
    chatCompletionStream(options: Omit<ChatCompletionOptions, 'stream'>): AsyncIterable<ChatCompletionChunk>;
    generate(prompt: string, systemPrompt?: string): Promise<string>;
    /**
     * Chat completion with streaming and token callback.
     * Invokes the callback for each token received during streaming.
     */
    chatCompletionWithCallback(options: Omit<ChatCompletionOptions, 'stream'>, onToken: TokenCallbackType): Promise<ChatCompletionResponse>;
    /**
     * Generate with streaming and token callback.
     */
    generateWithCallback(prompt: string, systemPrompt?: string, onToken?: TokenCallbackType): Promise<string>;
    close(): void;
}
//# sourceMappingURL=openrouter-llm.d.ts.map