export interface ToolClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export declare class ToolClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: ToolClientOptions);
    listTools(): Promise<string[]>;
    close(): void;
}
//# sourceMappingURL=tool-client.d.ts.map