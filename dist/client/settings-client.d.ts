import { SettingsSchema } from '../models/api';
export interface SettingsClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export declare class SettingsClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: SettingsClientOptions);
    getAgentSchema(): Promise<SettingsSchema>;
    getConversationSchema(): Promise<SettingsSchema>;
    close(): void;
}
//# sourceMappingURL=settings-client.d.ts.map