/**
 * Remote conversation state management
 */
import { HttpClient } from '../client/http-client';
import { RemoteEventsList } from '../events/remote-events-list';
import { ConversationID, Event, ConversationExecutionStatus, AgentExecutionStatus, ConfirmationPolicyBase, AgentBase, ConversationCallbackType } from '../types/base';
import { ConversationInfo } from '../models/conversation';
export interface ConversationStateUpdateEvent extends Event {
    kind: 'ConversationStateUpdateEvent';
    key: string;
    value: any;
}
export declare class RemoteState {
    private client;
    private conversationId;
    private _events;
    private cachedState;
    private cachedAt;
    private lock;
    /** Cache TTL in milliseconds. Cached state older than this triggers a re-fetch. */
    static CACHE_TTL_MS: number;
    constructor(client: HttpClient, conversationId: string);
    private getConversationInfo;
    /**
     * Force a fresh fetch from the server, ignoring the cache.
     */
    refresh(): Promise<ConversationInfo>;
    updateStateFromEvent(event: ConversationStateUpdateEvent): Promise<void>;
    createStateUpdateCallback(onError?: (error: Error) => void): ConversationCallbackType;
    get events(): RemoteEventsList;
    get id(): ConversationID;
    /**
     * Helper to unwrap full_state if present
     */
    private unwrapState;
    /**
     * Get the current execution status of the conversation.
     * This method handles both the new `execution_status` field and the legacy `agent_status` field.
     */
    getExecutionStatus(): Promise<ConversationExecutionStatus>;
    /**
     * @deprecated Use getExecutionStatus() instead. This method is kept for backward compatibility.
     */
    getAgentStatus(): Promise<AgentExecutionStatus>;
    setAgentStatus(value: AgentExecutionStatus): Promise<void>;
    getConfirmationPolicy(): Promise<ConfirmationPolicyBase>;
    getActivatedKnowledgeSkills(): Promise<string[]>;
    getAgent(): Promise<AgentBase>;
    getWorkspace(): Promise<any>;
    getPersistenceDir(): Promise<string>;
    modelDump(): Promise<Record<string, any>>;
    modelDumpJson(): Promise<string>;
}
//# sourceMappingURL=remote-state.d.ts.map