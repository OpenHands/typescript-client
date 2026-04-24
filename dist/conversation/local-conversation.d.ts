/**
 * Local conversation implementation
 *
 * This implements the IConversation interface for local execution. Unlike RemoteConversation,
 * LocalConversation runs the agent loop locally without connecting to a remote server.
 *
 * This mirrors the Python SDK's LocalConversation class.
 */
import { ConversationID, Message, ConfirmationPolicyBase, ConversationStats, AgentBase, SecretValue, LLM } from '../types/base';
import { IWorkspace } from '../workspace/base';
import { IConversation, IConversationState, BaseConversationOptions } from './base';
import { ILLM, ChatMessage, Tool, ToolCall, TokenStreamEvent } from '../llm/base';
import { SecretRegistry } from './secret-registry';
import { StuckDetectionThresholds, StuckDetectionResult } from './stuck-detector';
import { ConfirmationPolicy } from '../security/confirmation-policy';
import { SecurityAnalyzer } from '../security/security-analyzer';
/**
 * Tool executor function type.
 * Takes a tool call and returns the result string.
 */
export type ToolExecutor = (toolCall: ToolCall) => Promise<string> | string;
/**
 * Token callback type for the conversation level.
 */
export type ConversationTokenCallback = (event: TokenStreamEvent) => void;
/**
 * Options for creating a LocalConversation instance.
 */
export interface LocalConversationOptions extends BaseConversationOptions {
    /** The LLM instance to use for the conversation */
    llm: ILLM;
    /** Optional system prompt for the agent */
    systemPrompt?: string;
    /** Optional persistence directory for saving conversation state */
    persistenceDir?: string;
    /** Custom tools to provide to the LLM (in addition to or instead of built-in tools) */
    tools?: Tool[];
    /** Custom tool executor function. If provided, handles all tool calls. */
    toolExecutor?: ToolExecutor;
    /** Whether to include built-in tools (execute_command, read_file, etc.). Default: true if no custom tools provided */
    includeBuiltinTools?: boolean;
    /** Token callback for streaming tokens during LLM generation */
    tokenCallback?: ConversationTokenCallback;
    /** Enable stuck detection (default: true) */
    stuckDetection?: boolean;
    /** Custom thresholds for stuck detection */
    stuckDetectionThresholds?: Partial<StuckDetectionThresholds>;
    /** Security analyzer for evaluating action risks */
    securityAnalyzer?: SecurityAnalyzer;
    /** Initial secrets to provide to the conversation */
    secrets?: Record<string, SecretValue>;
}
/**
 * Local conversation implementation that runs the agent loop locally.
 *
 * LocalConversation provides direct agent execution on the local system without
 * requiring a remote server. It integrates with an LLM (via ILLM interface) to
 * process messages and execute tool calls through the LocalWorkspace.
 *
 * Example:
 * ```typescript
 * const workspace = new LocalWorkspace({ workingDir: '/path/to/project' });
 * const llm = new OpenRouterLLM({ apiKey: 'your-key', defaultModel: 'anthropic/claude-3.5-sonnet' });
 * const conversation = new LocalConversation(agent, workspace, {
 *   llm,
 *   maxIterations: 500,
 *   systemPrompt: 'You are a helpful assistant...'
 * });
 * await conversation.start({ initialMessage: 'Hello!' });
 * await conversation.run();
 * await conversation.close();
 * ```
 */
export declare class LocalConversation implements IConversation {
    readonly agent: AgentBase;
    readonly workspace: IWorkspace;
    readonly llm: ILLM;
    private _conversationId?;
    private _state?;
    private _title?;
    private callback?;
    private tokenCallback?;
    private persistenceDir?;
    private systemPrompt;
    private maxIterations;
    private messages;
    private _isPaused;
    private _isFinished;
    private _isWaitingForConfirmation;
    private customTools?;
    private toolExecutor?;
    private includeBuiltinTools;
    private secretRegistry;
    private stuckDetector?;
    private stuckDetectionEnabled;
    private securityAnalyzer?;
    constructor(agent: AgentBase, workspace: IWorkspace, options: LocalConversationOptions);
    /**
     * Check whether the workspace supports actual operations.
     * LocalWorkspace is a stub that throws on all operations.
     */
    private workspaceIsStub;
    /**
     * Get the tools available to the agent.
     * Workspace-dependent tools (execute_command, read_file, write_file) are only
     * included when the workspace supports actual operations.
     */
    private getTools;
    get id(): ConversationID;
    get state(): IConversationState;
    /**
     * Start or resume a conversation.
     */
    start(options?: {
        initialMessage?: string;
        maxIterations?: number;
        stuckDetection?: boolean;
    }): Promise<void>;
    /**
     * Get conversation statistics.
     */
    conversationStats(): Promise<ConversationStats>;
    /**
     * Send a message to the agent.
     */
    sendMessage(message: string | Message): Promise<void>;
    /**
     * Execute the agent loop to process messages.
     *
     * This runs the agent until:
     * - The agent calls the finish() tool
     * - Maximum iterations reached
     * - pause() is called
     * - An error occurs
     */
    run(): Promise<void>;
    /**
     * Handle a tool call from the LLM.
     */
    private handleToolCall;
    /**
     * Execute a built-in tool.
     */
    private executeBuiltinTool;
    /**
     * Pause agent execution.
     */
    pause(): Promise<void>;
    /**
     * Set the confirmation policy.
     */
    setConfirmationPolicy(policy: ConfirmationPolicyBase | ConfirmationPolicy): Promise<void>;
    /**
     * Send a confirmation response.
     *
     * Note: Confirmation handling is not yet fully implemented in LocalConversation.
     */
    sendConfirmationResponse(accept: boolean, reason?: string): Promise<void>;
    setTitle(title: string): Promise<void>;
    /**
     * Generate a title for the conversation using the LLM.
     */
    generateTitle(maxLength?: number, _llm?: LLM): Promise<string>;
    /**
     * Update secrets available to the agent.
     * Secrets are stored in the SecretRegistry and can be used for:
     * - Environment variable injection into commands
     * - Output masking to prevent accidental exposure
     */
    updateSecrets(secrets: Record<string, SecretValue>): Promise<void>;
    /**
     * Ask the agent a simple, stateless question and get a direct LLM response.
     *
     * This bypasses the normal conversation flow and does NOT modify, persist,
     * or become part of the conversation state. The request is not remembered by
     * the main agent, no events are recorded, and execution status is untouched.
     *
     * @param question - A simple string question to ask the agent
     * @returns A string response from the agent
     */
    askAgent(question: string): Promise<string>;
    /**
     * Reject all pending actions awaiting confirmation.
     *
     * @param reason - The reason for rejection
     */
    rejectPendingActions(reason?: string): Promise<void>;
    /**
     * Set the security analyzer for evaluating action risks.
     *
     * @param analyzer - The security analyzer to use, or null to disable
     */
    setSecurityAnalyzer(analyzer: SecurityAnalyzer | null): void;
    /**
     * Check if the agent is currently stuck using the stuck detector.
     *
     * @returns StuckDetectionResult with details about any detected stuck pattern
     */
    checkIfStuck(): StuckDetectionResult;
    /**
     * Get the secret registry for direct access.
     * Useful for masking secrets in custom output handling.
     */
    getSecretRegistry(): SecretRegistry;
    /**
     * Mask any secrets in the given text.
     *
     * @param text - Text that may contain secret values
     * @returns Text with secret values replaced by <secret-hidden>
     */
    maskSecrets(text: string): string;
    /**
     * Start WebSocket client.
     *
     * NOTE: LocalConversation doesn't use WebSocket since it runs locally.
     */
    startWebSocketClient(): Promise<void>;
    /**
     * Stop WebSocket client.
     *
     * NOTE: LocalConversation doesn't use WebSocket.
     */
    stopWebSocketClient(): Promise<void>;
    /**
     * Close the conversation and cleanup resources.
     */
    close(): Promise<void>;
    /**
     * Get the current message history.
     */
    getMessages(): ChatMessage[];
    /**
     * Emit a typed event and call the callback if provided.
     */
    private emitTypedEvent;
    /**
     * Emit an event (legacy format) and call the callback if provided.
     * @deprecated Use emitTypedEvent instead
     */
    private emitEvent;
    /**
     * Generate a unique conversation ID.
     */
    private generateConversationId;
}
//# sourceMappingURL=local-conversation.d.ts.map