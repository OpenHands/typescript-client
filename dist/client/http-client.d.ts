/**
 * HTTP client for OpenHands Agent Server API
 */
export interface HttpClientOptions {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
}
export type ResponseType = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer';
export interface RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    params?: Record<string, unknown>;
    data?: unknown;
    headers?: Record<string, string>;
    timeout?: number;
    acceptableStatusCodes?: Set<number>;
    responseType?: ResponseType;
}
export interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}
export declare class HttpError extends Error {
    status: number;
    statusText: string;
    response?: unknown | undefined;
    constructor(status: number, statusText: string, response?: unknown | undefined, message?: string);
}
export declare class HttpClient {
    private baseUrl;
    private apiKey?;
    private timeout;
    constructor(options: HttpClientOptions);
    request<T = unknown>(options: RequestOptions): Promise<HttpResponse<T>>;
    private parseResponse;
    get<T = unknown>(url: string, options?: Omit<RequestOptions, 'method' | 'url'>): Promise<HttpResponse<T>>;
    post<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'url' | 'data'>): Promise<HttpResponse<T>>;
    put<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'url' | 'data'>): Promise<HttpResponse<T>>;
    patch<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'url' | 'data'>): Promise<HttpResponse<T>>;
    delete<T = unknown>(url: string, options?: Omit<RequestOptions, 'method' | 'url'>): Promise<HttpResponse<T>>;
    close(): void;
}
//# sourceMappingURL=http-client.d.ts.map