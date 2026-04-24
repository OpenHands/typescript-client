import { VSCodeStatusResponse } from '../models/api';
export interface VSCodeClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export interface GetVSCodeUrlOptions {
    baseUrl?: string;
    workspaceDir?: string;
}
export declare class VSCodeClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: VSCodeClientOptions);
    getUrl(options?: GetVSCodeUrlOptions): Promise<string | null>;
    getStatus(): Promise<VSCodeStatusResponse>;
    close(): void;
}
//# sourceMappingURL=vscode-client.d.ts.map