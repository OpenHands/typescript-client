/**
 * HTTP client for OpenHands Agent Server API
 */
export class HttpError extends Error {
    constructor(status, statusText, response, message) {
        super(message || `HTTP ${status}: ${statusText}`);
        this.status = status;
        this.statusText = statusText;
        this.response = response;
        this.name = 'HttpError';
    }
}
export class HttpClient {
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.timeout = options.timeout || 60000;
    }
    async request(options) {
        const relativePath = options.url.startsWith('/') ? options.url.slice(1) : options.url;
        const url = new URL(relativePath, this.baseUrl + '/');
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach((item) => url.searchParams.append(key, String(item)));
                    }
                    else {
                        url.searchParams.append(key, String(value));
                    }
                }
            });
        }
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (this.apiKey) {
            headers['X-Session-API-Key'] = this.apiKey;
        }
        const requestInit = {
            method: options.method,
            headers,
            signal: AbortSignal.timeout(options.timeout || this.timeout),
        };
        if (options.data && options.method !== 'GET') {
            if (options.data instanceof FormData) {
                delete headers['Content-Type'];
                requestInit.body = options.data;
            }
            else {
                requestInit.body = JSON.stringify(options.data);
            }
        }
        try {
            const response = await fetch(url.toString(), requestInit);
            const isAcceptable = options.acceptableStatusCodes?.has(response.status) ||
                (!options.acceptableStatusCodes && response.ok);
            if (!isAcceptable) {
                let errorContent;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        errorContent = await response.json();
                    }
                    else {
                        errorContent = await response.text();
                    }
                }
                catch {
                    errorContent = null;
                }
                throw new HttpError(response.status, response.statusText, errorContent, `HTTP request failed (${response.status} ${response.statusText}): ${JSON.stringify(errorContent)}`);
            }
            const data = (await this.parseResponse(response, options.responseType || 'auto'));
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
            };
        }
        catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${options.timeout || this.timeout}ms`, {
                        cause: error,
                    });
                }
                throw new Error(`Request failed: ${error.message}`, { cause: error });
            }
            throw new Error('Unknown request error', { cause: error });
        }
    }
    async parseResponse(response, responseType) {
        if (responseType === 'json') {
            return (await response.json());
        }
        if (responseType === 'text') {
            return (await response.text());
        }
        if (responseType === 'blob') {
            return (await response.blob());
        }
        if (responseType === 'arrayBuffer') {
            return (await response.arrayBuffer());
        }
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            return (await response.json());
        }
        return (await response.text());
    }
    async get(url, options) {
        return this.request({ method: 'GET', url, ...options });
    }
    async post(url, data, options) {
        return this.request({ method: 'POST', url, data, ...options });
    }
    async put(url, data, options) {
        return this.request({ method: 'PUT', url, data, ...options });
    }
    async patch(url, data, options) {
        return this.request({ method: 'PATCH', url, data, ...options });
    }
    async delete(url, options) {
        return this.request({ method: 'DELETE', url, ...options });
    }
    close() {
        // No cleanup needed for fetch-based client
    }
}
//# sourceMappingURL=http-client.js.map