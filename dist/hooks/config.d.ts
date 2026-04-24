/**
 * Hook configuration loading and management.
 *
 * Mirrors the Python SDK's openhands.sdk.hooks.config module.
 * Browser-safe: no file I/O operations (those happen server-side).
 */
import { HookEventType, HookType } from './types';
/**
 * Valid snake_case field names for hook events.
 * This is the single source of truth for hook event types.
 */
export declare const HOOK_EVENT_FIELDS: ReadonlySet<string>;
/**
 * A single hook definition.
 */
export interface HookDefinition {
    type?: HookType;
    command: string;
    timeout?: number;
    async?: boolean;
}
/**
 * Matches events to hooks based on patterns.
 *
 * Supports exact match, wildcard (*), and regex (auto-detected or /pattern/).
 */
export interface HookMatcher {
    matcher?: string;
    hooks: HookDefinition[];
}
/**
 * Configuration for all hooks.
 */
export interface HookConfig {
    pre_tool_use: HookMatcher[];
    post_tool_use: HookMatcher[];
    user_prompt_submit: HookMatcher[];
    session_start: HookMatcher[];
    session_end: HookMatcher[];
    stop: HookMatcher[];
    [key: string]: HookMatcher[];
}
/**
 * Check if a matcher matches the given tool name.
 */
export declare function matcherMatches(matcherDef: HookMatcher, toolName?: string | null): boolean;
/**
 * Create an empty HookConfig.
 */
export declare function createEmptyHookConfig(): HookConfig;
/**
 * Check if a HookConfig has no hooks configured.
 */
export declare function isHookConfigEmpty(config: HookConfig): boolean;
/**
 * Normalize raw hooks data, supporting PascalCase keys and the legacy `{hooks: ...}` wrapper.
 */
export declare function normalizeHooksInput(data: Record<string, unknown>): Record<string, unknown>;
/**
 * Create a HookConfig from a raw data object.
 * Supports both PascalCase and snake_case keys, and the legacy "hooks" wrapper.
 */
export declare function hookConfigFromData(data: Record<string, unknown>): HookConfig;
/**
 * Get all hook definitions that match a given event type and optional tool name.
 */
export declare function getHooksForEvent(config: HookConfig, eventType: HookEventType, toolName?: string | null): HookDefinition[];
/**
 * Check if there are any hooks configured for an event type.
 */
export declare function hasHooksForEvent(config: HookConfig, eventType: HookEventType): boolean;
/**
 * Merge multiple hook configs by concatenating handlers per event type.
 * Returns null if the result is empty.
 */
export declare function mergeHookConfigs(configs: HookConfig[]): HookConfig | null;
/**
 * Serialize a HookConfig to a plain object suitable for JSON/API payloads.
 * Only includes non-empty fields.
 */
export declare function hookConfigToJSON(config: HookConfig): Record<string, unknown>;
//# sourceMappingURL=config.d.ts.map