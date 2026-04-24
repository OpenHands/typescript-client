import { HttpClient } from './http-client';
export class LLMMetadataClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async getProviders() {
        const response = await this.client.get('/api/llm/providers');
        return response.data.providers;
    }
    async getModels(provider) {
        const response = await this.client.get('/api/llm/models', {
            params: provider ? { provider } : undefined,
        });
        return response.data.models;
    }
    async getVerifiedModels() {
        const response = await this.client.get('/api/llm/models/verified');
        return response.data.models;
    }
    close() {
        this.client.close();
    }
}
//# sourceMappingURL=llm-client.js.map