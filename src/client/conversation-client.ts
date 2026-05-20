import { HttpClient } from './http-client';
import { Success } from '../types/base';
import type {
  AskAgentResponse,
  ConfirmationResponseRequest,
  ConversationInfo,
  ConversationSearchRequest,
  ConversationSearchResponse,
  UpdateConversationRequest,
} from '../models/conversation';

export interface ConversationClientOptions {
  host: string;
  apiKey?: string;
  timeout?: number;
}

export type CreateConversationPayload = Record<string, unknown>;

export interface SendConversationEventOptions {
  run?: boolean;
}

/**
 * Read-side options the agent-server's conversation routes accept as
 * query parameters. Keep field names camelCase here; the client maps
 * them to the snake_case wire form (``include_skills``) when emitting.
 */
export interface ConversationReadOptions {
  /**
   * When ``false``, the server drops ``agent.agent_context.skills`` from
   * the response payload. Default is ``true`` (full response), which
   * preserves the existing public-API shape — ``RemoteConversation``
   * and any other consumer that round-trips the agent config continue
   * to work without changes. Opt in when the caller doesn't read
   * skill bodies and wants to avoid the ~260 KB of inlined skill
   * content that ``load_user_skills=true`` / ``load_public_skills=true``
   * agents accumulate.
   */
  includeSkills?: boolean;
}

/**
 * Translate {@link ConversationReadOptions} into the query-param dict
 * the agent-server expects. Omitted / undefined fields aren't sent,
 * so the server applies its own default (currently ``include_skills=true``).
 */
function buildConversationReadParams(
  options: ConversationReadOptions | undefined
): Record<string, unknown> {
  if (!options) return {};
  const params: Record<string, unknown> = {};
  if (options.includeSkills !== undefined) {
    params.include_skills = options.includeSkills;
  }
  return params;
}

export class ConversationClient {
  public readonly host: string;
  public readonly apiKey?: string;
  private readonly client: HttpClient;

  constructor(options: ConversationClientOptions) {
    this.host = options.host.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.client = new HttpClient({
      baseUrl: this.host,
      apiKey: this.apiKey,
      timeout: options.timeout || 60000,
    });
  }

  async createConversation<TConversation = ConversationInfo>(
    payload: CreateConversationPayload,
    options?: ConversationReadOptions
  ): Promise<TConversation> {
    const response = await this.client.post<TConversation>(
      '/api/conversations',
      payload,
      { params: buildConversationReadParams(options) }
    );
    return response.data;
  }

  async searchConversations(
    options: ConversationSearchRequest & ConversationReadOptions = {}
  ): Promise<ConversationSearchResponse> {
    const { includeSkills, ...searchOptions } = options;
    const response = await this.client.get<ConversationSearchResponse>(
      '/api/conversations/search',
      {
        params: {
          ...(searchOptions as Record<string, unknown>),
          ...buildConversationReadParams({ includeSkills }),
        },
      }
    );
    return response.data;
  }

  async getConversations<TConversation = ConversationInfo>(
    conversationIds: string[],
    options?: ConversationReadOptions
  ): Promise<Array<TConversation | null>> {
    const response = await this.client.get<Array<TConversation | null>>('/api/conversations', {
      params: { ids: conversationIds, ...buildConversationReadParams(options) },
    });
    return response.data;
  }

  async getConversation<TConversation = ConversationInfo>(
    conversationId: string,
    options?: ConversationReadOptions
  ): Promise<TConversation> {
    const response = await this.client.get<TConversation>(
      `/api/conversations/${conversationId}`,
      { params: buildConversationReadParams(options) }
    );
    return response.data;
  }

  async sendEvent(
    conversationId: string,
    event: object,
    options: SendConversationEventOptions = {}
  ): Promise<void> {
    await this.client.post(`/api/conversations/${conversationId}/events`, {
      ...event,
      ...(options.run === undefined ? {} : { run: options.run }),
    });
  }

  async pauseConversation(conversationId: string): Promise<Success> {
    const response = await this.client.post<Success>(
      `/api/conversations/${conversationId}/pause`,
      {}
    );
    return response.data;
  }

  async runConversation(conversationId: string): Promise<Success> {
    const response = await this.client.post<Success>(
      `/api/conversations/${conversationId}/run`,
      {}
    );
    return response.data;
  }

  async askAgent(conversationId: string, question: string): Promise<AskAgentResponse> {
    const response = await this.client.post<AskAgentResponse>(
      `/api/conversations/${conversationId}/ask_agent`,
      { question }
    );
    return response.data;
  }

  async getEventCount(conversationId: string): Promise<number> {
    const response = await this.client.get<number>(
      `/api/conversations/${conversationId}/events/count`
    );
    return response.data;
  }

  async respondToConfirmation<TResponse = unknown>(
    conversationId: string,
    request: ConfirmationResponseRequest
  ): Promise<TResponse> {
    const response = await this.client.post<TResponse>(
      `/api/conversations/${conversationId}/events/respond_to_confirmation`,
      request
    );
    return response.data;
  }

  async switchProfile(conversationId: string, profileName: string): Promise<void> {
    await this.client.post<Success>(`/api/conversations/${conversationId}/switch_profile`, {
      profile_name: profileName,
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.client.delete<Success>(`/api/conversations/${conversationId}`);
  }

  async updateConversation<TConversation = ConversationInfo>(
    conversationId: string,
    update: UpdateConversationRequest
  ): Promise<TConversation> {
    const response = await this.client.patch<TConversation>(
      `/api/conversations/${conversationId}`,
      update
    );
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
