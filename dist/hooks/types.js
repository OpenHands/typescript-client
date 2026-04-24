/**
 * Hook event types and data structures.
 *
 * Mirrors the Python SDK's openhands.sdk.hooks.types module.
 */
/**
 * Types of hook events that can trigger hooks.
 */
export var HookEventType;
(function (HookEventType) {
    HookEventType["PRE_TOOL_USE"] = "PreToolUse";
    HookEventType["POST_TOOL_USE"] = "PostToolUse";
    HookEventType["USER_PROMPT_SUBMIT"] = "UserPromptSubmit";
    HookEventType["SESSION_START"] = "SessionStart";
    HookEventType["SESSION_END"] = "SessionEnd";
    HookEventType["STOP"] = "Stop";
})(HookEventType || (HookEventType = {}));
/**
 * Types of hooks that can be executed.
 */
export var HookType;
(function (HookType) {
    HookType["COMMAND"] = "command";
    HookType["PROMPT"] = "prompt";
})(HookType || (HookType = {}));
/**
 * Decisions a hook can make about an operation.
 */
export var HookDecision;
(function (HookDecision) {
    HookDecision["ALLOW"] = "allow";
    HookDecision["DENY"] = "deny";
})(HookDecision || (HookDecision = {}));
/**
 * Check whether the operation should continue after this hook result.
 */
export function hookResultShouldContinue(result) {
    if (result.blocked)
        return false;
    if (result.decision === HookDecision.DENY)
        return false;
    return true;
}
/**
 * Create a default successful HookResult.
 */
export function createSuccessResult() {
    return {
        success: true,
        blocked: false,
        exit_code: 0,
        stdout: '',
        stderr: '',
        decision: null,
        reason: null,
        additional_context: null,
        error: null,
        async_started: false,
    };
}
//# sourceMappingURL=types.js.map