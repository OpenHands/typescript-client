import { HttpClient } from './http-client';
export class VSCodeClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async getUrl(options = {}) {
        const response = await this.client.get('/api/vscode/url', {
            params: {
                ...(options.baseUrl ? { base_url: options.baseUrl } : {}),
                ...(options.workspaceDir ? { workspace_dir: options.workspaceDir } : {}),
            },
        });
        return response.data.url;
    }
    async getStatus() {
        const response = await this.client.get('/api/vscode/status');
        return response.data;
    }
    close() {
        this.client.close();
    }
}
//# sourceMappingURL=vscode-client.js.map