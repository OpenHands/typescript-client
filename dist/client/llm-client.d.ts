export interface LLMMetadataClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export declare class LLMMetadataClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: LLMMetadataClientOptions);
    getProviders(): Promise<string[]>;
    getModels(provider?: string): Promise<string[]>;
    getVerifiedModels(): Promise<Record<string, string[]>>;
    close(): void;
}
//# sourceMappingURL=llm-client.d.ts.map