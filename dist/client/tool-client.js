import { HttpClient } from './http-client';
export class ToolClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async listTools() {
        const response = await this.client.get('/api/tools/');
        return response.data;
    }
    close() {
        this.client.close();
    }
}
//# sourceMappingURL=tool-client.js.map