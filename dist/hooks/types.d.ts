/**
 * Hook event types and data structures.
 *
 * Mirrors the Python SDK's openhands.sdk.hooks.types module.
 */
/**
 * Types of hook events that can trigger hooks.
 */
export declare enum HookEventType {
    PRE_TOOL_USE = "PreToolUse",
    POST_TOOL_USE = "PostToolUse",
    USER_PROMPT_SUBMIT = "UserPromptSubmit",
    SESSION_START = "SessionStart",
    SESSION_END = "SessionEnd",
    STOP = "Stop"
}
/**
 * Types of hooks that can be executed.
 */
export declare enum HookType {
    COMMAND = "command",
    PROMPT = "prompt"
}
/**
 * Decisions a hook can make about an operation.
 */
export declare enum HookDecision {
    ALLOW = "allow",
    DENY = "deny"
}
/**
 * Data passed to hook scripts via stdin as JSON.
 */
export interface HookEvent {
    event_type: HookEventType | string;
    tool_name?: string | null;
    tool_input?: Record<string, unknown> | null;
    tool_response?: Record<string, unknown> | null;
    message?: string | null;
    session_id?: string | null;
    working_dir?: string | null;
    metadata?: Record<string, unknown>;
}
/**
 * Result from executing a hook.
 *
 * Exit code 0 = success, exit code 2 = block operation.
 */
export interface HookResult {
    success: boolean;
    blocked: boolean;
    exit_code: number;
    stdout: string;
    stderr: string;
    decision?: HookDecision | null;
    reason?: string | null;
    additional_context?: string | null;
    error?: string | null;
    async_started?: boolean;
}
/**
 * Check whether the operation should continue after this hook result.
 */
export declare function hookResultShouldContinue(result: HookResult): boolean;
/**
 * Create a default successful HookResult.
 */
export declare function createSuccessResult(): HookResult;
//# sourceMappingURL=types.d.ts.map