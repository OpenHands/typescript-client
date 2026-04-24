/**
 * Remote conversation implementation
 *
 * This implements the IConversation interface by connecting to a remote OpenHands
 * agent server. It mirrors the Python SDK's RemoteConversation class.
 */
import { ErrorCallbackType } from '../events/websocket-client';
import { RemoteState } from './remote-state';
import { RemoteWorkspace } from '../workspace/remote-workspace';
import { ConversationID, Message, ConfirmationPolicyBase, ConversationStats, AgentBase, SecretValue, LLM } from '../types/base';
import { ForkConversationRequest } from '../models/conversation';
import { IConversation, BaseConversationOptions } from './base';
import type { HookConfig } from '../hooks';
/**
 * Options for creating a RemoteConversation instance.
 */
export interface RemoteConversationOptions extends BaseConversationOptions {
    /**
     * Optional hook configuration for this conversation.
     * Hooks are shell scripts that run server-side at key lifecycle events
     * (PreToolUse, PostToolUse, UserPromptSubmit, Stop, etc.).
     */
    hookConfig?: HookConfig;
    /**
     * Optional error callback for non-fatal errors (WebSocket issues, state update failures).
     * If not provided, these errors are silently ignored.
     */
    onError?: ErrorCallbackType;
}
/**
 * Remote conversation implementation that connects to an OpenHands agent server.
 *
 * RemoteConversation provides access to a conversation running on a remote
 * OpenHands agent server. This is the recommended approach for production deployments
 * as it provides better isolation and security.
 *
 * Example:
 * ```typescript
 * const workspace = new RemoteWorkspace({
 *   host: 'https://agent-server.example.com',
 *   workingDir: '/workspace',
 *   apiKey: 'your-api-key'
 * });
 * const conversation = new RemoteConversation(agent, workspace, {
 *   callback: (event) => console.log(event)
 * });
 * await conversation.start({ initialMessage: 'Hello!' });
 * await conversation.run();
 * await conversation.close();
 * ```
 */
export declare class RemoteConversation implements IConversation {
    readonly agent: AgentBase;
    readonly workspace: RemoteWorkspace;
    private _conversationId?;
    private _state?;
    private client;
    private wsClient?;
    private callback?;
    private onError?;
    private hookConfig?;
    constructor(agent: AgentBase, workspace: RemoteWorkspace, options?: RemoteConversationOptions);
    get id(): ConversationID;
    get state(): RemoteState;
    start(options?: {
        initialMessage?: string;
        maxIterations?: number;
        stuckDetection?: boolean;
        hookConfig?: HookConfig;
    }): Promise<void>;
    /**
     * Load hooks configuration from the server workspace.
     *
     * This calls the server's hooks endpoint to read `.openhands/hooks.json`
     * from the project directory.
     *
     * @param projectDir - Optional project directory path. Defaults to the workspace working dir.
     * @returns The hook configuration, or null if no hooks are configured.
     */
    loadHooks(projectDir?: string): Promise<HookConfig | null>;
    /**
     * Get the hook configuration for this conversation from the server.
     *
     * Fetches the current conversation info and returns the hook_config field.
     *
     * @returns The hook configuration, or null if no hooks are configured.
     */
    getHookConfig(): Promise<HookConfig | null>;
    conversationStats(): Promise<ConversationStats>;
    sendMessage(message: string | Message): Promise<void>;
    run(): Promise<void>;
    pause(): Promise<void>;
    setConfirmationPolicy(policy: ConfirmationPolicyBase): Promise<void>;
    sendConfirmationResponse(accept: boolean, reason?: string): Promise<void>;
    setTitle(title: string): Promise<void>;
    generateTitle(maxLength?: number, llm?: LLM): Promise<string>;
    /**
     * Ask the agent a simple question without affecting conversation state.
     * This is useful for getting quick answers or clarifications.
     */
    askAgent(question: string): Promise<string>;
    /**
     * Get the agent's final response text for this conversation.
     */
    getAgentFinalResponse(): Promise<string>;
    /**
     * Switch the conversation to a named LLM profile.
     */
    switchProfile(profileName: string): Promise<void>;
    /**
     * Fork the current conversation and return a new RemoteConversation instance.
     */
    fork(request?: ForkConversationRequest): Promise<RemoteConversation>;
    /**
     * Download the persisted conversation trajectory as a ZIP blob.
     */
    downloadTrajectory(): Promise<Blob>;
    /**
     * Force condensation of the conversation history.
     * This can help reduce memory usage for long conversations.
     */
    condense(): Promise<void>;
    /**
     * Set the security analyzer for the conversation.
     * The security analyzer evaluates action risks.
     */
    setSecurityAnalyzer(securityAnalyzer: any | null): Promise<void>;
    updateSecrets(secrets: Record<string, SecretValue>): Promise<void>;
    startWebSocketClient(): Promise<void>;
    stopWebSocketClient(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=remote-conversation.d.ts.map