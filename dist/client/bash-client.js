import { HttpClient, HttpError } from './http-client';
export class BashClient {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: options.timeout || 60000,
        });
    }
    async searchEvents(options = {}) {
        const response = await this.client.get('/api/bash/bash_events/search', {
            params: options,
        });
        return response.data;
    }
    async getEvent(eventId) {
        const response = await this.client.get(`/api/bash/bash_events/${eventId}`);
        return response.data;
    }
    async getEvents(eventIds) {
        return Promise.all(eventIds.map(async (eventId) => {
            try {
                return await this.getEvent(eventId);
            }
            catch (error) {
                if (error instanceof HttpError && error.status === 404) {
                    return null;
                }
                throw error;
            }
        }));
    }
    async startCommand(request, cwd, timeout) {
        const payload = this.normalizeRequest(request, cwd, timeout);
        const response = await this.client.post('/api/bash/start_bash_command', payload);
        return response.data;
    }
    async executeCommand(request, cwd, timeout) {
        const payload = this.normalizeRequest(request, cwd, timeout);
        const response = await this.client.post('/api/bash/execute_bash_command', payload, {
            timeout: ((payload.timeout || 30) + 10) * 1000,
        });
        return response.data;
    }
    async clearEvents() {
        const response = await this.client.delete('/api/bash/bash_events');
        return response.data;
    }
    close() {
        this.client.close();
    }
    normalizeRequest(request, cwd, timeout) {
        if (typeof request === 'string') {
            return {
                command: request,
                ...(cwd ? { cwd } : {}),
                ...(timeout !== undefined ? { timeout: Math.floor(timeout) } : {}),
            };
        }
        return {
            ...request,
            ...(request.timeout !== undefined ? { timeout: Math.floor(request.timeout) } : {}),
        };
    }
}
//# sourceMappingURL=bash-client.js.map