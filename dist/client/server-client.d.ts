import { AliveStatus, ReadyStatus } from '../models/api';
import { ServerInfo } from '../types/base';
export interface ServerClientOptions {
    host: string;
    apiKey?: string;
    timeout?: number;
}
export declare class ServerClient {
    readonly host: string;
    readonly apiKey?: string;
    private readonly client;
    constructor(options: ServerClientOptions);
    getRoot<T = unknown>(): Promise<T>;
    getAlive(): Promise<AliveStatus>;
    getHealth(): Promise<string>;
    getReady(): Promise<ReadyStatus>;
    getServerInfo(): Promise<ServerInfo>;
    close(): void;
}
//# sourceMappingURL=server-client.d.ts.map