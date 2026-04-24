import { BashCommand, BashEvent, BashEventPage, BashEventSearchOptions, BashOutput, ClearBashEventsResponse, ExecuteBashRequest } from '../models/workspace';
export interface BashClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export declare class BashClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: BashClientOptions);
    searchEvents(options?: BashEventSearchOptions): Promise<BashEventPage>;
    getEvent(eventId: string): Promise<BashEvent>;
    getEvents(eventIds: string[]): Promise<Array<BashEvent | null>>;
    startCommand(request: string | ExecuteBashRequest, cwd?: string, timeout?: number): Promise<BashCommand>;
    executeCommand(request: string | ExecuteBashRequest, cwd?: string, timeout?: number): Promise<BashOutput>;
    clearEvents(): Promise<ClearBashEventsResponse>;
    close(): void;
    private normalizeRequest;
}
//# sourceMappingURL=bash-client.d.ts.map