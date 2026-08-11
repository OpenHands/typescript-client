import { HttpClient } from './http-client';
import {
  CreateConnectionRequest,
  CreateProfileFromConnectionRequest,
  DisconnectConnectionResponse,
  LLMSubscriptionDevicePollRequest,
  LLMSubscriptionDeviceStartResponse,
  LLMSubscriptionModelsResponse,
  LLMSubscriptionStatusResponse,
  ModelsResponse,
  ProfileFromConnectionResponse,
  ProviderConnection,
  ProvidersResponse,
  UpdateConnectionRequest,
  ValidateConnectionResponse,
  VerifiedModelsResponse,
} from '../models/api';

export interface LLMMetadataClientOptions {
  host: string;
  apiKey?: string;
  timeout?: number;
}

export class LLMMetadataClient {
  public readonly host: string;
  public readonly apiKey?: string;
  private readonly client: HttpClient;

  constructor(options: LLMMetadataClientOptions) {
    this.host = options.host.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.client = new HttpClient({
      baseUrl: this.host,
      apiKey: this.apiKey,
      timeout: options.timeout || 60000,
    });
  }

  async getProviders(): Promise<string[]> {
    const response = await this.client.get<ProvidersResponse>('/api/llm/providers');
    return response.data.providers;
  }

  async getModels(provider?: string): Promise<string[]> {
    const response = await this.client.get<ModelsResponse>('/api/llm/models', {
      params: provider ? { provider } : undefined,
    });
    return response.data.models;
  }

  async getVerifiedModels(): Promise<Record<string, string[]>> {
    const response = await this.client.get<VerifiedModelsResponse>('/api/llm/models/verified');
    return response.data.models;
  }

  async getOpenAISubscriptionModels(): Promise<string[]> {
    const response = await this.client.get<LLMSubscriptionModelsResponse>(
      '/api/llm/subscription/openai/models'
    );
    return response.data.models;
  }

  async getOpenAISubscriptionStatus(): Promise<LLMSubscriptionStatusResponse> {
    const response = await this.client.get<LLMSubscriptionStatusResponse>(
      '/api/llm/subscription/openai/status'
    );
    return response.data;
  }

  async startOpenAISubscriptionDeviceLogin(): Promise<LLMSubscriptionDeviceStartResponse> {
    const response = await this.client.post<LLMSubscriptionDeviceStartResponse>(
      '/api/llm/subscription/openai/device/start'
    );
    return response.data;
  }

  async pollOpenAISubscriptionDeviceLogin(
    deviceCode: string
  ): Promise<LLMSubscriptionStatusResponse> {
    const body: LLMSubscriptionDevicePollRequest = { device_code: deviceCode };
    const response = await this.client.post<LLMSubscriptionStatusResponse>(
      '/api/llm/subscription/openai/device/poll',
      body
    );
    return response.data;
  }

  async logoutOpenAISubscription(): Promise<LLMSubscriptionStatusResponse> {
    const response = await this.client.post<LLMSubscriptionStatusResponse>(
      '/api/llm/subscription/openai/logout'
    );
    return response.data;
  }

  // ── Provider Connections (/api/llm/connections) ───────────────────────
  //
  // Connect a vendor once with one key, pick from its model catalog. The key is
  // stored as a named secret server-side and never returned (api_key_set only).

  async listConnections(): Promise<ProviderConnection[]> {
    const response = await this.client.get<ProviderConnection[]>('/api/llm/connections');
    return response.data;
  }

  async createConnection(body: CreateConnectionRequest): Promise<ProviderConnection> {
    const response = await this.client.post<ProviderConnection>('/api/llm/connections', body);
    return response.data;
  }

  async getConnection(connectionId: string): Promise<ProviderConnection> {
    const response = await this.client.get<ProviderConnection>(
      `/api/llm/connections/${encodeURIComponent(connectionId)}`
    );
    return response.data;
  }

  async updateConnection(
    connectionId: string,
    body: UpdateConnectionRequest
  ): Promise<ProviderConnection> {
    const response = await this.client.patch<ProviderConnection>(
      `/api/llm/connections/${encodeURIComponent(connectionId)}`,
      body
    );
    return response.data;
  }

  /**
   * Disconnect a connection. Returns the LLM profiles that referenced its key
   * (they will need a new key before they can authenticate again).
   */
  async deleteConnection(connectionId: string): Promise<DisconnectConnectionResponse> {
    const response = await this.client.delete<DisconnectConnectionResponse>(
      `/api/llm/connections/${encodeURIComponent(connectionId)}`
    );
    return response.data;
  }

  /**
   * Validate a connection's key against its provider. Pass `live` to issue a
   * real network probe; the response's `verified` flag reflects whether that
   * happened (catalog-only validation returns `verified: false`).
   */
  async validateConnection(
    connectionId: string,
    options?: { live?: boolean }
  ): Promise<ValidateConnectionResponse> {
    const query = options?.live ? '?live=true' : '';
    const response = await this.client.post<ValidateConnectionResponse>(
      `/api/llm/connections/${encodeURIComponent(connectionId)}/validate${query}`
    );
    return response.data;
  }

  /**
   * Create an LLM profile bound to this connection's key. The profile stores an
   * `api_key` reference to the connection's secret rather than the raw key, so
   * rotating the connection updates every profile spawned from it.
   */
  async createProfileFromConnection(
    connectionId: string,
    body: CreateProfileFromConnectionRequest
  ): Promise<ProfileFromConnectionResponse> {
    const response = await this.client.post<ProfileFromConnectionResponse>(
      `/api/llm/connections/${encodeURIComponent(connectionId)}/profiles`,
      body
    );
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
