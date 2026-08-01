/** Agent Server event types and narrowing helpers. */

import type {
  ActionEvent,
  AgentErrorEvent,
  Condensation,
  ConversationErrorEvent,
  HookExecutionEvent,
  MessageEvent,
  ObservationEvent,
  UserRejectObservation,
} from '../generated/agent-server-schema';

export type {
  AcpToolCallEvent as ACPToolCallEvent,
  ActionEvent,
  AgentErrorEvent,
  Condensation as CondensationEvent,
  CondensationRequest as CondensationRequestEvent,
  CondensationSummaryEvent,
  ConversationErrorEvent,
  ConversationStateUpdateEvent,
  ErrorClassification,
  Event as ConversationEvent,
  HookExecutionEvent,
  LlmCompletionLogEvent as LLMCompletionLogEvent,
  MessageEvent,
  MessageToolCall,
  ObservationEvent,
  PauseEvent,
  SecurityRisk,
  StreamingDeltaEvent,
  SystemPromptEvent,
  TokenEvent,
  ToolDefinition,
  UserRejectObservation,
} from '../generated/agent-server-schema';

function hasKind(event: unknown, kind: string): boolean {
  return typeof event === 'object' && event !== null && 'kind' in event && event.kind === kind;
}

export function isMessageEvent(event: unknown): event is MessageEvent {
  return hasKind(event, 'MessageEvent');
}

export function isActionEvent(event: unknown): event is ActionEvent {
  return hasKind(event, 'ActionEvent');
}

export function isObservationEvent(event: unknown): event is ObservationEvent {
  return hasKind(event, 'ObservationEvent');
}

export function isAgentErrorEvent(event: unknown): event is AgentErrorEvent {
  return hasKind(event, 'AgentErrorEvent');
}

export function isObservationLike(event: unknown): event is ObservationEvent | AgentErrorEvent | UserRejectObservation {
  return hasKind(event, 'ObservationEvent') || hasKind(event, 'AgentErrorEvent') || hasKind(event, 'UserRejectObservation');
}

export function isConversationErrorEvent(event: unknown): event is ConversationErrorEvent {
  return hasKind(event, 'ConversationErrorEvent');
}

export function isCondensationEvent(event: unknown): event is Condensation {
  return hasKind(event, 'Condensation');
}

export function isHookExecutionEvent(event: unknown): event is HookExecutionEvent {
  return hasKind(event, 'HookExecutionEvent');
}
