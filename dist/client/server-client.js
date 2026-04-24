import { HttpClient } from './http-client';
export class ServerClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async getRoot() {
        const response = await this.client.get('/');
        return response.data;
    }
    async getAlive() {
        const response = await this.client.get('/alive');
        return response.data;
    }
    async getHealth() {
        const response = await this.client.get('/health');
        return response.data;
    }
    async getReady() {
        const response = await this.client.get('/ready', {
            acceptableStatusCodes: new Set([200, 503]),
        });
        return response.data;
    }
    async getServerInfo() {
        const response = await this.client.get('/server_info');
        return response.data;
    }
    close() {
        this.client.close();
    }
}
//# sourceMappingURL=server-client.js.map