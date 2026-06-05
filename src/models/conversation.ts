/**
 * Conversation-related models and interfaces
 */

import {
  ConversationID,
  ConversationExecutionStatus,
  AgentExecutionStatus,
  ConfirmationPolicyBase,
  ConversationStats,
  AgentBase,
  AgentContext,
  Event,
  EventPage,
  Message,
} from '../types/base';
import type { HookConfig } from '../hooks';

export enum ConversationSortOrder {
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  CREATED_AT_DESC = 'CREATED_AT_DESC',
  UPDATED_AT_DESC = 'UPDATED_AT_DESC',
}

export interface ConversationInfo {
  id: ConversationID;
  /**
   * Current execution status of the conversation.
   * Note: This field was renamed from agent_status to execution_status in the API.
   */
  execution_status: ConversationExecutionStatus;
  /**
   * @deprecated Use execution_status instead. This field is kept for backward compatibility.
   */
  agent_status?: AgentExecutionStatus;
  confirmation_policy: ConfirmationPolicyBase;
  activated_knowledge_skills: string[];
  invoked_skills?: string[];
  agent: AgentBase;
  workspace: unknown;
  persistence_dir: string;
  max_iterations?: number;
  stuck_detection?: boolean;
  conversation_stats?: ConversationStats;
  /** API may return stats instead of conversation_stats */
  stats?: ConversationStats;
  hook_config?: HookConfig | null;
  blocked_actions?: Record<string, string>;
  blocked_messages?: Record<string, string>;
  title?: string;
  created_at?: string;
  updated_at?: string;
  tags?: Record<string, string>;
  /**
   * @deprecated Use execution_status instead. This field is kept for backward compatibility.
   */
  status?: ConversationExecutionStatus;
  [key: string]: unknown;
}

export interface ACPAgentConfig {
  kind?: string;
  [key: string]: unknown;
}

export type ACPConversationInfo = ConversationInfo & {
  agent: ACPAgentConfig;
};

export interface SendMessageRequest {
  role: 'user';
  content: Array<{
    type: string;
    text?: string;
    image_urls?: string[];
  }>;
  run: boolean;
}

export interface ConfirmationResponseRequest {
  accept: boolean;
  reason?: string;
}

export interface CreateConversationRequest {
  agent: AgentBase;
  initial_message?: Message;
  max_iterations: number;
  stuck_detection: boolean;
  workspace: Record<string, unknown>;
  hook_config?: HookConfig | null;
  user_id?: string | null;
  /** Secrets seeded into the conversation's secret_registry at init. */
  secrets?: Record<string, SecretObject>;
}

export interface CreateACPConversationRequest {
  agent: ACPAgentConfig;
  initial_message?: Message;
  max_iterations: number;
  stuck_detection: boolean;
  workspace: Record<string, unknown>;
  hook_config?: HookConfig | null;
  user_id?: string | null;
  /** Secrets seeded into the conversation's secret_registry at init. */
  secrets?: Record<string, SecretObject>;
}

export interface GenerateTitleRequest {
  max_length: number;
  llm?: unknown;
}

export interface GenerateTitleResponse {
  title: string;
}

export interface UpdateConversationRequest {
  title?: string;
  tags?: Record<string, string>;
}

export interface StaticSecret {
  kind: 'StaticSecret';
  value?: string | null;
  description?: string | null;
}

export interface LookupSecret {
  kind: 'LookupSecret';
  url: string;
  headers?: Record<string, string>;
  description?: string | null;
  /**
   * @deprecated v1.23.0 agent servers use `url` and optional `headers`.
   */
  source?: string;
  /**
   * @deprecated v1.23.0 agent servers use `url` and optional `headers`.
   */
  key?: string;
}

export type SecretObject = StaticSecret | LookupSecret;

export interface UpdateSecretsRequest {
  secrets: Record<string, SecretObject>;
}

export interface ConversationSearchRequest {
  page_id?: string;
  limit?: number;
  status?: ConversationExecutionStatus;
  sort_order?: ConversationSortOrder;
  tag?: string[];
}

export interface AskAgentRequest {
  question: string;
}

export interface AskAgentResponse {
  response: string;
}

export interface SetSecurityAnalyzerRequest {
  security_analyzer: unknown | null;
}

export interface SetConfirmationPolicyRequest {
  policy: ConfirmationPolicyBase;
}

export interface ConversationEventSearchOptions {
  page_id?: string;
  limit?: number;
  kind?: string;
  source?: string;
  body?: string;
  sort_order?: 'TIMESTAMP' | 'TIMESTAMP_DESC';
  timestamp__gte?: string;
  timestamp__lt?: string;
}

export type ConversationEventCountOptions = Omit<
  ConversationEventSearchOptions,
  'page_id' | 'limit' | 'sort_order'
>;

export interface ConversationSearchResponse {
  items: ConversationInfo[];
  next_page_id?: string;
  total_count?: number;
}

export interface ACPConversationSearchResponse {
  items: ACPConversationInfo[];
  next_page_id?: string;
  total_count?: number;
}

export interface ForkConversationRequest {
  id?: string;
  title?: string;
  tags?: Record<string, string>;
  reset_metrics?: boolean;
}

export interface AgentResponseResult {
  response: string;
}

export type ConversationEvent = Event;
export type ConversationEventPage = EventPage;

/**
 * Lift secrets from an agent's context into the top-level `request.secrets` field.
 *
 * Mirrors Python SDK's `_start_request_kwargs()` behavior: if the agent carries
 * `agent_context.secrets`, they are promoted so the agent-server seeds
 * `secret_registry` from them at conversation init rather than relying on the
 * `_start_acp_server()` drain.
 *
 * Merge order: `agentContextSecrets` first, then `panelSecrets` override —
 * mirrors SDK: `{**provider_secrets, **existing}` where panel/existing wins.
 *
 * @param agent - The agent whose `agent_context.secrets` to lift.
 * @param panelSecrets - User-configured secrets that take priority over agent creds.
 * @returns Merged secrets dict suitable for `StartConversationRequest.secrets`.
 */
export function liftAgentContextSecrets(
  agent: AgentBase,
  panelSecrets?: Record<string, SecretObject>
): Record<string, SecretObject> {
  const ctx = agent.agent_context as AgentContext | null | undefined;
  const contextSecrets = (ctx?.secrets as Record<string, SecretObject> | undefined) ?? {};
  return { ...contextSecrets, ...(panelSecrets ?? {}) };
}
