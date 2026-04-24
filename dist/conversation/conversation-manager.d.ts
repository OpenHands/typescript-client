/**
 * Conversation manager for handling multiple conversations
 */
import { DesktopClient } from '../client/desktop-client';
import { LLMMetadataClient } from '../client/llm-client';
import { ServerClient } from '../client/server-client';
import { SettingsClient } from '../client/settings-client';
import { SkillsClient } from '../client/skills-client';
import { ToolClient } from '../client/tool-client';
import { VSCodeClient } from '../client/vscode-client';
import { RemoteConversation } from './remote-conversation';
import { ACPAgentConfig, ACPConversationInfo, ACPConversationSearchResponse, ConversationInfo, ConversationSearchRequest, ConversationSearchResponse, UpdateConversationRequest } from '../models/conversation';
import { AgentBase, ConversationExecutionStatus, ConversationID } from '../types/base';
export declare class ACPConversationNamespace {
    private readonly manager;
    constructor(manager: ConversationManager);
    searchConversations(options?: ConversationSearchRequest): Promise<ACPConversationSearchResponse>;
    countConversations(options?: {
        status?: ConversationExecutionStatus;
    }): Promise<number>;
    getConversations(conversationIds: ConversationID[]): Promise<Array<ACPConversationInfo | null>>;
    getAllConversations(): Promise<ACPConversationInfo[]>;
    getConversation(conversationId: ConversationID): Promise<ACPConversationInfo>;
    createConversation(agent: ACPAgentConfig, options?: {
        initialMessage?: string;
        maxIterations?: number;
        stuckDetection?: boolean;
        workingDir?: string;
    }): Promise<ACPConversationInfo>;
}
export interface ConversationManagerOptions {
    host: string;
    apiKey?: string;
}
export declare class ConversationManager {
    private readonly client;
    readonly host: string;
    readonly apiKey?: string;
    readonly server: ServerClient;
    readonly llm: LLMMetadataClient;
    readonly settings: SettingsClient;
    readonly skills: SkillsClient;
    readonly tools: ToolClient;
    readonly vscode: VSCodeClient;
    readonly desktop: DesktopClient;
    readonly acp: ACPConversationNamespace;
    constructor(options: ConversationManagerOptions);
    /**
     * Search/list conversations
     */
    searchConversations(options?: ConversationSearchRequest): Promise<ConversationSearchResponse>;
    /**
     * Count conversations matching the provided filters.
     */
    countConversations(options?: {
        status?: ConversationExecutionStatus;
    }): Promise<number>;
    /**
     * Batch get conversations by ID.
     */
    getConversations(conversationIds: ConversationID[]): Promise<Array<ConversationInfo | null>>;
    /**
     * Get all conversations (convenience method)
     */
    getAllConversations(options?: {
        tag?: string[];
    }): Promise<ConversationInfo[]>;
    /**
     * Get a specific conversation by ID
     */
    getConversation(conversationId: ConversationID): Promise<ConversationInfo>;
    /**
     * Create a new conversation
     */
    createConversation(agent: AgentBase, options?: {
        initialMessage?: string;
        maxIterations?: number;
        stuckDetection?: boolean;
        workingDir?: string;
    }): Promise<RemoteConversation>;
    /**
     * Load an existing conversation
     */
    loadConversation(conversationId: ConversationID, workingDir?: string): Promise<RemoteConversation>;
    /**
     * Search ACP-capable conversations.
     */
    searchACPConversations(options?: ConversationSearchRequest): Promise<ACPConversationSearchResponse>;
    /**
     * Count ACP-capable conversations.
     */
    countACPConversations(options?: {
        status?: ConversationExecutionStatus;
    }): Promise<number>;
    /**
     * Batch get ACP-capable conversations by ID.
     */
    getACPConversations(conversationIds: ConversationID[]): Promise<Array<ACPConversationInfo | null>>;
    /**
     * Get all ACP-capable conversations (convenience method).
     */
    getAllACPConversations(): Promise<ACPConversationInfo[]>;
    /**
     * Get a specific ACP-capable conversation by ID.
     */
    getACPConversation(conversationId: ConversationID): Promise<ACPConversationInfo>;
    /**
     * Create a new ACP-capable conversation.
     */
    createACPConversation(agent: ACPAgentConfig, options?: {
        initialMessage?: string;
        maxIterations?: number;
        stuckDetection?: boolean;
        workingDir?: string;
    }): Promise<ACPConversationInfo>;
    /**
     * Delete a conversation
     */
    deleteConversation(conversationId: ConversationID): Promise<void>;
    /**
     * Update conversation metadata (e.g. title)
     */
    updateConversation(conversationId: ConversationID, update: UpdateConversationRequest): Promise<ConversationInfo>;
    /**
     * Close the manager and cleanup resources
     */
    close(): void;
}
//# sourceMappingURL=conversation-manager.d.ts.map