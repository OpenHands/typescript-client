/**
 * Base types and interfaces for the OpenHands Agent Server TypeScript client
 */
export var EventSortOrder;
(function (EventSortOrder) {
    EventSortOrder["TIMESTAMP"] = "TIMESTAMP";
    EventSortOrder["TIMESTAMP_DESC"] = "TIMESTAMP_DESC";
})(EventSortOrder || (EventSortOrder = {}));
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (EventSortOrder) {
    /** @deprecated Use TIMESTAMP_DESC instead. */
    EventSortOrder.REVERSE_TIMESTAMP = 'TIMESTAMP_DESC';
})(EventSortOrder || (EventSortOrder = {}));
/**
 * Enum representing the current execution state of the conversation.
 * Note: This was renamed from AgentExecutionStatus to ConversationExecutionStatus
 * in the agent-server API.
 */
export var ConversationExecutionStatus;
(function (ConversationExecutionStatus) {
    ConversationExecutionStatus["IDLE"] = "idle";
    ConversationExecutionStatus["RUNNING"] = "running";
    ConversationExecutionStatus["PAUSED"] = "paused";
    ConversationExecutionStatus["WAITING_FOR_CONFIRMATION"] = "waiting_for_confirmation";
    ConversationExecutionStatus["FINISHED"] = "finished";
    ConversationExecutionStatus["ERROR"] = "error";
    ConversationExecutionStatus["STUCK"] = "stuck";
    ConversationExecutionStatus["DELETING"] = "deleting";
})(ConversationExecutionStatus || (ConversationExecutionStatus = {}));
/**
 * @deprecated Use ConversationExecutionStatus instead. This alias is kept for backward compatibility.
 */
export const AgentExecutionStatus = ConversationExecutionStatus;
//# sourceMappingURL=base.js.map