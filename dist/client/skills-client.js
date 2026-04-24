import { HttpClient } from './http-client';
export class SkillsClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async getSkills(request = {}) {
        const response = await this.client.post('/api/skills', request);
        return response.data;
    }
    async syncSkills() {
        const response = await this.client.post('/api/skills/sync', {});
        return response.data;
    }
    close() {
        this.client.close();
    }
}
//# sourceMappingURL=skills-client.js.map