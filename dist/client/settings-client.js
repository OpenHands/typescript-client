import { HttpClient } from './http-client';
export class SettingsClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async getAgentSchema() {
        const response = await this.client.get('/api/settings/agent-schema');
        return response.data;
    }
    async getConversationSchema() {
        const response = await this.client.get('/api/settings/conversation-schema');
        return response.data;
    }
    close() {
        this.client.close();
    }
}
//# sourceMappingURL=settings-client.js.map