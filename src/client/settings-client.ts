import { HttpClient } from './http-client';
import {
  CustomSecretCreate,
  CustomSecretResponse,
  SecretsResponse,
  SettingsResponse,
  SettingsSchema,
  SettingsUpdateRequest,
} from '../models/api';

export interface SettingsClientOptions {
  host: string;
  apiKey?: string;
  timeout?: number;
}

export class SettingsClient {
  public readonly host: string;
  public readonly apiKey?: string;
  private readonly client: HttpClient;

  constructor(options: SettingsClientOptions) {
    this.host = options.host.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.client = new HttpClient({
      baseUrl: this.host,
      apiKey: this.apiKey,
      timeout: options.timeout || 60000,
    });
  }

  // ── Schema Endpoints ──────────────────────────────────────────────────

  async getAgentSchema(): Promise<SettingsSchema> {
    const response = await this.client.get<SettingsSchema>('/api/settings/agent-schema');
    return response.data;
  }

  async getConversationSchema(): Promise<SettingsSchema> {
    const response = await this.client.get<SettingsSchema>('/api/settings/conversation-schema');
    return response.data;
  }

  // ── Settings CRUD ─────────────────────────────────────────────────────

  /**
   * Get current settings.
   */
  async getSettings(): Promise<SettingsResponse> {
    const response = await this.client.get<SettingsResponse>('/api/settings');
    return response.data;
  }

  /**
   * Update settings with partial changes.
   * Accepts `agent_settings_diff` and/or `conversation_settings_diff`
   * for incremental updates.
   */
  async updateSettings(settings: SettingsUpdateRequest): Promise<SettingsResponse> {
    const response = await this.client.post<SettingsResponse>('/api/settings', settings);
    return response.data;
  }

  // ── Secrets CRUD ──────────────────────────────────────────────────────

  /**
   * List all available secrets (names and descriptions only, no values).
   */
  async listSecrets(): Promise<SecretsResponse> {
    const response = await this.client.get<SecretsResponse>('/api/settings/secrets');
    return response.data;
  }

  /**
   * Get a single secret value by name.
   * Returns the raw secret value as plain text.
   */
  async getSecretValue(name: string): Promise<string> {
    const response = await this.client.get<string>(`/api/settings/secrets/${encodeURIComponent(name)}`);
    return response.data;
  }

  /**
   * Create or update a custom secret.
   */
  async createSecret(secret: CustomSecretCreate): Promise<CustomSecretResponse> {
    const response = await this.client.post<CustomSecretResponse>('/api/settings/secrets', secret);
    return response.data;
  }

  /**
   * Delete a custom secret by name.
   */
  async deleteSecret(name: string): Promise<{ deleted: boolean }> {
    const response = await this.client.delete<{ deleted: boolean }>(
      `/api/settings/secrets/${encodeURIComponent(name)}`,
    );
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
