/**
 * Secret Registry for Conversations
 *
 * Manages secrets and injects them into commands when needed.
 * Provides secret masking in output to prevent accidental exposure.
 * This mirrors the Python SDK's SecretRegistry class.
 */
import { SecretValue } from '../types/base';
export type { SecretValue } from '../types/base';
/**
 * Secret source types
 */
export type SecretSourceKind = 'static' | 'callable';
/**
 * Base interface for secret sources
 */
export interface SecretSource {
    kind: SecretSourceKind;
    getValue(): string | null;
}
/**
 * Static secret source - stores a fixed value
 */
export declare class StaticSecretSource implements SecretSource {
    readonly kind: SecretSourceKind;
    private value;
    constructor(value: string);
    getValue(): string;
}
/**
 * Callable secret source - evaluates a function to get the value
 */
export declare class CallableSecretSource implements SecretSource {
    readonly kind: SecretSourceKind;
    private getter;
    constructor(getter: () => string);
    getValue(): string | null;
}
/**
 * Manages secrets and injects them into bash commands when needed.
 *
 * The secret registry stores a mapping of secret keys to SecretSources
 * that retrieve the actual secret values. When a bash command is about to be
 * executed, it scans the command for any secret keys and provides the
 * corresponding environment variables.
 *
 * Additionally, it tracks the latest exported values to enable consistent masking
 * even when callable secrets fail on subsequent calls.
 *
 * Example:
 * ```typescript
 * const registry = new SecretRegistry();
 * registry.updateSecrets({
 *   'API_KEY': 'sk-secret-key',
 *   'DYNAMIC_TOKEN': () => getToken(),
 * });
 *
 * // Get env vars for a command
 * const envVars = registry.getSecretsAsEnvVars('curl -H "Authorization: Bearer $API_KEY" ...');
 *
 * // Mask secrets in output
 * const maskedOutput = registry.maskSecretsInOutput('Response with sk-secret-key visible');
 * // Returns: 'Response with <secret-hidden> visible'
 * ```
 */
export declare class SecretRegistry {
    /** Map of secret key to secret source */
    private secretSources;
    /** Cache of successfully exported values for masking */
    private exportedValues;
    /**
     * Add or update secrets in the registry.
     *
     * @param secrets - Dictionary mapping secret keys to values or callable functions
     */
    updateSecrets(secrets: Record<string, SecretValue>): void;
    /**
     * Remove a secret from the registry.
     *
     * @param key - The secret key to remove
     */
    removeSecret(key: string): void;
    /**
     * Clear all secrets from the registry.
     */
    clearSecrets(): void;
    /**
     * Get the number of registered secrets.
     */
    get size(): number;
    /**
     * Get all registered secret keys.
     */
    get keys(): string[];
    /**
     * Find all secret keys mentioned in the given text.
     * Uses case-insensitive matching.
     *
     * @param text - The text to search for secret keys
     * @returns Set of secret keys found in the text
     */
    findSecretsInText(text: string): Set<string>;
    /**
     * Get secrets that should be exported as environment variables for a command.
     *
     * @param command - The bash command to check for secret references
     * @returns Dictionary of environment variables to export (key -> value)
     */
    getSecretsAsEnvVars(command: string): Record<string, string>;
    /**
     * Mask secret values in the given text.
     *
     * This method uses the currently exported values to ensure comprehensive masking.
     * It replaces all known secret values with '<secret-hidden>'.
     *
     * @param text - The text to mask secrets in
     * @returns Text with secret values replaced by <secret-hidden>
     */
    maskSecretsInOutput(text: string): string;
    /**
     * Check if a specific secret key is registered.
     *
     * @param key - The secret key to check
     * @returns True if the key is registered
     */
    hasSecret(key: string): boolean;
    /**
     * Serialize the registry state for persistence.
     * Note: Callable secrets cannot be serialized and will be omitted.
     * Secret values are redacted by default for security.
     *
     * @param exposeSecrets - If true, include actual secret values (use with caution!)
     * @returns Serialized registry state
     */
    serialize(exposeSecrets?: boolean): Record<string, string | null>;
    /**
     * Restore secrets from serialized state.
     * Only static secrets can be restored.
     *
     * @param state - Previously serialized state
     */
    deserialize(state: Record<string, string | null>): void;
}
//# sourceMappingURL=secret-registry.d.ts.map