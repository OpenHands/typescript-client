/**
 * Rich event types for conversations
 *
 * These event types mirror the Python SDK's event system, providing
 * structured events for all conversation activities.
 */
/**
 * Type guard to check if an event is a MessageEvent
 */
export function isMessageEvent(event) {
    return event.kind === 'MessageEvent';
}
/**
 * Type guard to check if an event is an ActionEvent
 */
export function isActionEvent(event) {
    return event.kind === 'ActionEvent';
}
/**
 * Type guard to check if an event is an ObservationEvent
 */
export function isObservationEvent(event) {
    return event.kind === 'ObservationEvent';
}
/**
 * Type guard to check if an event is an AgentErrorEvent
 */
export function isAgentErrorEvent(event) {
    return event.kind === 'AgentErrorEvent';
}
/**
 * Type guard to check if event is observation-like (has action_id)
 */
export function isObservationLike(event) {
    return (event.kind === 'ObservationEvent' ||
        event.kind === 'AgentErrorEvent' ||
        event.kind === 'UserRejectObservation');
}
/**
 * Type guard to check if an event is a ConversationErrorEvent
 */
export function isConversationErrorEvent(event) {
    return event.kind === 'ConversationErrorEvent';
}
/**
 * Type guard to check if an event is a CondensationEvent
 */
export function isCondensationEvent(event) {
    return event.kind === 'Condensation';
}
/**
 * Type guard to check if an event is a HookExecutionEvent
 */
export function isHookExecutionEvent(event) {
    return event.kind === 'HookExecutionEvent';
}
/**
 * Generate a unique event ID
 */
export function generateEventId() {
    return `evt_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
}
/**
 * Create a base event with common fields
 */
export function createBaseEvent(kind, source) {
    return {
        id: generateEventId(),
        kind,
        timestamp: new Date().toISOString(),
        source,
    };
}
//# sourceMappingURL=types.js.map