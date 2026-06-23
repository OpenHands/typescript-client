import { HttpClient } from './http-client';
import type { MarketplaceCatalogResponse } from '../models/api';

export interface PluginsClientOptions {
  host: string;
  apiKey?: string;
  timeout?: number;
}

export class PluginsClient {
  public readonly host: string;
  public readonly apiKey?: string;
  private readonly client: HttpClient;

  constructor(options: PluginsClientOptions) {
    this.host = options.host.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.client = new HttpClient({
      baseUrl: this.host,
      apiKey: this.apiKey,
      timeout: options.timeout || 60000,
    });
  }

  async getPluginsMarketplace(): Promise<MarketplaceCatalogResponse> {
    const response = await this.client.get<MarketplaceCatalogResponse>('/api/plugins/marketplace');
    return response.data;
  }

  close(): void {
    this.client.close();
  }
}
