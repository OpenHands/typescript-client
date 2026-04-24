import { HttpClient } from './http-client';
export class DesktopClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async getUrl(baseUrl) {
        const response = await this.client.get('/api/desktop/url', {
            params: baseUrl ? { base_url: baseUrl } : undefined,
        });
        return response.data.url;
    }
    close() {
        this.client.close();
    }
}
//# sourceMappingURL=desktop-client.js.map