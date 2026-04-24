/**
 * LLM factory and utility functions
 *
 * This module provides a convenient factory pattern for creating LLM instances.
 */
import type { ILLM, LLMProviderType } from './base';
import { OpenRouterLLM, OpenRouterLLMOptions } from './openrouter-llm';
/**
 * Union type for all LLM options
 */
export type LLMOptions = OpenRouterLLMOptions;
/**
 * Options for creating an LLM with explicit provider selection
 */
export interface CreateLLMOptions {
    provider: LLMProviderType;
    options: LLMOptions;
}
/**
 * Factory function to create an LLM instance based on provider.
 *
 * Currently supports:
 * - 'openrouter': OpenRouter API (300+ models)
 *
 * Future support planned for:
 * - 'openai': Direct OpenAI API
 * - 'anthropic': Direct Anthropic API
 * - 'custom': Custom endpoints
 *
 * Example:
 * ```typescript
 * const llm = createLLM({
 *   provider: 'openrouter',
 *   options: {
 *     apiKey: 'your-api-key',
 *     defaultModel: 'anthropic/claude-3.5-sonnet'
 *   }
 * });
 *
 * const response = await llm.generate('Hello!');
 * ```
 *
 * @param config - The LLM configuration including provider and options
 * @returns An LLM instance implementing ILLM
 */
export declare function createLLM(config: CreateLLMOptions): ILLM;
/**
 * Create an OpenRouter LLM instance directly.
 *
 * This is a convenience function for the most common use case.
 *
 * Example:
 * ```typescript
 * const llm = createOpenRouterLLM({
 *   apiKey: 'your-api-key',
 *   defaultModel: 'openai/gpt-4o'
 * });
 * ```
 *
 * @param options - OpenRouter-specific options
 * @returns An OpenRouterLLM instance
 */
export declare function createOpenRouterLLM(options: OpenRouterLLMOptions): OpenRouterLLM;
/**
 * LLM class that extends OpenRouterLLM for backwards compatibility
 * and provides a simple default LLM implementation.
 *
 * Example:
 * ```typescript
 * const llm = new LLM({
 *   apiKey: 'your-api-key',
 *   defaultModel: 'anthropic/claude-3.5-sonnet'
 * });
 * ```
 */
export declare class LLM extends OpenRouterLLM {
    constructor(options: OpenRouterLLMOptions);
}
//# sourceMappingURL=llm.d.ts.map