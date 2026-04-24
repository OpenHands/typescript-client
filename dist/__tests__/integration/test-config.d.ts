/**
 * Integration test configuration
 */
export interface ServerTestConfig {
    agentServerUrl: string;
    agentWorkspaceDir: string;
    hostWorkspaceDir: string;
    testTimeout: number;
}
export interface TestConfig extends ServerTestConfig {
    llmModel: string;
    llmApiKey: string;
    llmBaseUrl?: string;
}
export declare function getServerTestConfig(): ServerTestConfig;
export declare function getTestConfig(): TestConfig;
export declare function skipIfNoConfig(): boolean;
export declare function createTestLLMConfig(): {
    base_url?: string | undefined;
    model: string;
    api_key: string;
};
//# sourceMappingURL=test-config.d.ts.map