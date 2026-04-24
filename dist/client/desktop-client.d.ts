export interface DesktopClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export declare class DesktopClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: DesktopClientOptions);
    getUrl(baseUrl?: string): Promise<string | null>;
    close(): void;
}
//# sourceMappingURL=desktop-client.d.ts.map