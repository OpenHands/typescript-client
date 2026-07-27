import {
  AgentServerFeatureRequirements,
  assertAgentServerSupports,
} from './agent-server-compatibility';
import { HttpClient } from './http-client';
import type {
  AgentServerMCPOAuthCallbackRequest,
  AgentServerMCPOAuthCallbackResponse,
  AgentServerMCPOAuthStatusResponse,
  AgentServerMCPStartOAuthRequest,
  AgentServerMCPStartOAuthResponse,
  AgentServerMCPTestRequest,
  AgentServerMCPTestResponse,
} from '../models/agent-server-api';
import type {
  MCPOAuthCallbackRequest as LegacyMCPOAuthCallbackRequest,
  MCPOAuthStartResponse as LegacyMCPOAuthStartResponse,
  MCPOAuthStatusResponse as LegacyMCPOAuthStatusResponse,
  MCPTestRequest as LegacyMCPTestRequest,
  MCPTestResponse as LegacyMCPTestResponse,
} from '../models/api';

export interface MCPClientOptions {
  host: string;
  apiKey?: string;
  timeout?: number;
}

export class MCPClient {
  public readonly host: string;
  public readonly apiKey?: string;
  private readonly client: HttpClient;

  constructor(options: MCPClientOptions) {
    this.host = options.host.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.client = new HttpClient({
      baseUrl: this.host,
      apiKey: this.apiKey,
      timeout: options.timeout || 60000,
    });
  }

  /**
   * @deprecated Pass `AgentServerMCPTestRequest` for generated contract
   * checking. This overload keeps existing callers source compatible while
   * they migrate.
   */
  async testServer(request: LegacyMCPTestRequest): Promise<LegacyMCPTestResponse>;
  async testServer(request: AgentServerMCPTestRequest): Promise<AgentServerMCPTestResponse>;
  async testServer(
    request: LegacyMCPTestRequest | AgentServerMCPTestRequest
  ): Promise<LegacyMCPTestResponse | AgentServerMCPTestResponse> {
    await assertAgentServerSupports(this.client, AgentServerFeatureRequirements.mcpTest);
    const response = await this.client.post<AgentServerMCPTestResponse>('/api/mcp/test', request, {
      timeout: (request.timeout ?? 15) * 1000 + 5000,
    });
    return response.data;
  }

  /**
   * @deprecated Pass `AgentServerMCPStartOAuthRequest` for generated contract
   * checking. This overload keeps existing callers source compatible while
   * they migrate.
   */
  async startOAuth(request: LegacyMCPTestRequest): Promise<LegacyMCPOAuthStartResponse>;
  async startOAuth(
    request: AgentServerMCPStartOAuthRequest
  ): Promise<AgentServerMCPStartOAuthResponse>;
  async startOAuth(
    request: LegacyMCPTestRequest | AgentServerMCPStartOAuthRequest
  ): Promise<LegacyMCPOAuthStartResponse | AgentServerMCPStartOAuthResponse> {
    await assertAgentServerSupports(this.client, AgentServerFeatureRequirements.mcpOAuth);
    const response = await this.client.post<AgentServerMCPStartOAuthResponse>(
      '/api/mcp/oauth/start',
      request,
      {
        timeout: (request.timeout ?? 15) * 1000 + 5000,
      }
    );
    return response.data;
  }

  /** @deprecated Use the generated `AgentServerMCPOAuthStatusResponse`. */
  async getOAuthStatus(jobId: string): Promise<LegacyMCPOAuthStatusResponse>;
  async getOAuthStatus(jobId: string): Promise<AgentServerMCPOAuthStatusResponse>;
  async getOAuthStatus(
    jobId: string
  ): Promise<LegacyMCPOAuthStatusResponse | AgentServerMCPOAuthStatusResponse> {
    await assertAgentServerSupports(this.client, AgentServerFeatureRequirements.mcpOAuth);
    const response = await this.client.get<AgentServerMCPOAuthStatusResponse>(
      `/api/mcp/oauth/status/${encodeURIComponent(jobId)}`
    );
    return response.data;
  }

  /**
   * @deprecated Pass `AgentServerMCPOAuthCallbackRequest` and consume
   * `AgentServerMCPOAuthCallbackResponse` for generated contract checking.
   */
  async submitOAuthCallback(
    jobId: string,
    request: LegacyMCPOAuthCallbackRequest
  ): Promise<LegacyMCPOAuthStatusResponse>;
  async submitOAuthCallback(
    jobId: string,
    request: AgentServerMCPOAuthCallbackRequest
  ): Promise<AgentServerMCPOAuthCallbackResponse>;
  async submitOAuthCallback(
    jobId: string,
    request: LegacyMCPOAuthCallbackRequest | AgentServerMCPOAuthCallbackRequest
  ): Promise<LegacyMCPOAuthStatusResponse | AgentServerMCPOAuthCallbackResponse> {
    await assertAgentServerSupports(this.client, AgentServerFeatureRequirements.mcpOAuth);
    const response = await this.client.post<AgentServerMCPOAuthCallbackResponse>(
      `/api/mcp/oauth/callback/${encodeURIComponent(jobId)}`,
      request
    );
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
