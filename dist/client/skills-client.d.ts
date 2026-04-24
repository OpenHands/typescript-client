import { SkillsRequest, SkillsResponse, SyncResponse } from '../models/api';
export interface SkillsClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export declare class SkillsClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: SkillsClientOptions);
    getSkills(request?: SkillsRequest): Promise<SkillsResponse>;
    syncSkills(): Promise<SyncResponse>;
    close(): void;
}
//# sourceMappingURL=skills-client.d.ts.map