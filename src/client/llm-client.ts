import { HttpClient } from './http-client';
import {
  CreateProviderRequest,
  LLMSubscriptionDevicePollRequest,
  LLMSubscriptionDeviceStartResponse,
  LLMSubscriptionModelsResponse,
  LLMSubscriptionStatusResponse,
  ModelProvider,
  ModelsResponse,
  ProviderModelPayload,
  ProvidersResponse,
  TestProviderResponse,
  UpdateProviderRequest,
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

  // ── Model Providers (/api/llm/model-providers) ────────────────────────
  //
  // Connect a provider once with one key, then manage its models under it
  // (add / edit / remove). The key is held on the provider as a named secret
  // server-side and never returned (only `api_key_set`; `secret_name` is never
  // exposed). See software-agent-sdk#4455.

  async listProviders(): Promise<ModelProvider[]> {
    const response = await this.client.get<ModelProvider[]>('/api/llm/model-providers');
    return response.data;
  }

  async createProvider(body: CreateProviderRequest): Promise<ModelProvider> {
    const response = await this.client.post<ModelProvider>('/api/llm/model-providers', body);
    return response.data;
  }

  async getProvider(providerId: string): Promise<ModelProvider> {
    const response = await this.client.get<ModelProvider>(
      `/api/llm/model-providers/${encodeURIComponent(providerId)}`
    );
    return response.data;
  }

  /** Update provider fields or rotate its key. Provide at least one field. */
  async updateProvider(
    providerId: string,
    body: UpdateProviderRequest
  ): Promise<ModelProvider> {
    const response = await this.client.patch<ModelProvider>(
      `/api/llm/model-providers/${encodeURIComponent(providerId)}`,
      body
    );
    return response.data;
  }

  /** Remove a provider and its named secret. Returns the removed provider. */
  async deleteProvider(providerId: string): Promise<ModelProvider> {
    const response = await this.client.delete<ModelProvider>(
      `/api/llm/model-providers/${encodeURIComponent(providerId)}`
    );
    return response.data;
  }

  /** Add a model under the provider. Returns the updated provider. */
  async addProviderModel(
    providerId: string,
    body: ProviderModelPayload
  ): Promise<ModelProvider> {
    const response = await this.client.post<ModelProvider>(
      `/api/llm/model-providers/${encodeURIComponent(providerId)}/models`,
      body
    );
    return response.data;
  }

  /** Rename a model and/or change its per-model wire-API override. */
  async updateProviderModel(
    providerId: string,
    modelName: string,
    body: ProviderModelPayload
  ): Promise<ModelProvider> {
    const response = await this.client.patch<ModelProvider>(
      `/api/llm/model-providers/${encodeURIComponent(providerId)}/models/` +
        `${encodeURIComponent(modelName)}`,
      body
    );
    return response.data;
  }

  /** Remove a model from the provider. Returns the updated provider. */
  async removeProviderModel(
    providerId: string,
    modelName: string
  ): Promise<ModelProvider> {
    const response = await this.client.delete<ModelProvider>(
      `/api/llm/model-providers/${encodeURIComponent(providerId)}/models/` +
        `${encodeURIComponent(modelName)}`
    );
    return response.data;
  }

  /**
   * Probe the provider's stored key. `verified` reflects whether a real network
   * check happened; `suggested_models` is a catalog convenience for the "add
   * model" affordance and never mutates the curated model list.
   */
  async testProvider(providerId: string): Promise<TestProviderResponse> {
    const response = await this.client.post<TestProviderResponse>(
      `/api/llm/model-providers/${encodeURIComponent(providerId)}/test`
    );
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
