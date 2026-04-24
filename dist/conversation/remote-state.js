/**
 * Remote conversation state management
 */
import { RemoteEventsList } from '../events/remote-events-list';
const FULL_STATE_KEY = '__full_state__';
export class RemoteState {
    constructor(client, conversationId) {
        this.cachedState = null;
        this.cachedAt = 0;
        this.lock = new AsyncLock();
        this.client = client;
        this.conversationId = conversationId;
        this._events = new RemoteEventsList(client, conversationId);
    }
    async getConversationInfo() {
        return await this.lock.acquire(async () => {
            // Return cached state if available and fresh
            if (this.cachedState !== null && Date.now() - this.cachedAt < RemoteState.CACHE_TTL_MS) {
                return this.cachedState;
            }
            // Fetch from REST API
            const response = await this.client.get(`/api/conversations/${this.conversationId}`);
            // Handle the case where the API returns a full_state wrapper
            let conversationInfo;
            if (response.data.full_state) {
                conversationInfo = response.data.full_state;
            }
            else {
                conversationInfo = response.data;
            }
            this.cachedState = conversationInfo;
            this.cachedAt = Date.now();
            return conversationInfo;
        });
    }
    /**
     * Force a fresh fetch from the server, ignoring the cache.
     */
    async refresh() {
        this.cachedState = null;
        return this.getConversationInfo();
    }
    async updateStateFromEvent(event) {
        await this.lock.acquire(async () => {
            // Handle full state snapshot
            if (event.key === FULL_STATE_KEY) {
                if (this.cachedState === null) {
                    this.cachedState = {};
                }
                const stateValue = event.value?.full_state ?? event.value;
                Object.assign(this.cachedState, stateValue);
            }
            else {
                if (this.cachedState === null) {
                    this.cachedState = {};
                }
                this.cachedState[event.key] = event.value;
            }
            this.cachedAt = Date.now();
        });
    }
    createStateUpdateCallback(onError) {
        return (event) => {
            if (event.kind === 'ConversationStateUpdateEvent') {
                this.updateStateFromEvent(event).catch((error) => {
                    if (onError) {
                        onError(error instanceof Error
                            ? error
                            : new Error(`Error updating state from event: ${error}`));
                    }
                });
            }
        };
    }
    get events() {
        return this._events;
    }
    get id() {
        return this.conversationId;
    }
    /**
     * Helper to unwrap full_state if present
     */
    unwrapState(info) {
        return info.full_state ?? info;
    }
    /**
     * Get the current execution status of the conversation.
     * This method handles both the new `execution_status` field and the legacy `agent_status` field.
     */
    async getExecutionStatus() {
        const info = await this.getConversationInfo();
        // Handle case where info might still be wrapped in full_state
        const unwrappedInfo = this.unwrapState(info);
        // Try new field first, fall back to legacy field
        const statusStr = unwrappedInfo.execution_status ?? unwrappedInfo.agent_status;
        if (statusStr === undefined || statusStr === null) {
            throw new Error(`execution_status missing in conversation info: ${JSON.stringify(info)}`);
        }
        return statusStr;
    }
    /**
     * @deprecated Use getExecutionStatus() instead. This method is kept for backward compatibility.
     */
    async getAgentStatus() {
        return this.getExecutionStatus();
    }
    async setAgentStatus(value) {
        throw new Error(`Setting execution_status on RemoteState has no effect. ` +
            `Remote execution status is managed server-side. Attempted to set: ${value}`);
    }
    async getConfirmationPolicy() {
        const info = await this.getConversationInfo();
        const unwrappedInfo = this.unwrapState(info);
        const policyData = unwrappedInfo.confirmation_policy;
        if (policyData === undefined || policyData === null) {
            throw new Error(`confirmation_policy missing in conversation info: ${JSON.stringify(info)}`);
        }
        return policyData;
    }
    async getActivatedKnowledgeSkills() {
        const info = await this.getConversationInfo();
        const unwrappedInfo = this.unwrapState(info);
        return unwrappedInfo.activated_knowledge_skills || [];
    }
    async getAgent() {
        const info = await this.getConversationInfo();
        const unwrappedInfo = this.unwrapState(info);
        const agentData = unwrappedInfo.agent;
        if (agentData === undefined || agentData === null) {
            throw new Error(`agent missing in conversation info: ${JSON.stringify(info)}`);
        }
        return agentData;
    }
    async getWorkspace() {
        const info = await this.getConversationInfo();
        const unwrappedInfo = this.unwrapState(info);
        const workspace = unwrappedInfo.workspace;
        if (workspace === undefined || workspace === null) {
            throw new Error(`workspace missing in conversation info: ${JSON.stringify(info)}`);
        }
        return workspace;
    }
    async getPersistenceDir() {
        const info = await this.getConversationInfo();
        const unwrappedInfo = this.unwrapState(info);
        const persistenceDir = unwrappedInfo.persistence_dir;
        if (persistenceDir === undefined || persistenceDir === null) {
            throw new Error(`persistence_dir missing in conversation info: ${JSON.stringify(info)}`);
        }
        return persistenceDir;
    }
    async modelDump() {
        const info = await this.getConversationInfo();
        const unwrappedInfo = this.unwrapState(info);
        return unwrappedInfo;
    }
    async modelDumpJson() {
        const data = await this.modelDump();
        return JSON.stringify(data);
    }
}
/** Cache TTL in milliseconds. Cached state older than this triggers a re-fetch. */
RemoteState.CACHE_TTL_MS = 2000;
// Simple async lock for serializing state access
class AsyncLock {
    constructor() {
        this.locked = false;
        this.queue = [];
    }
    async acquire(fn) {
        return new Promise((resolve, reject) => {
            const execute = async () => {
                try {
                    const result = await fn();
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
                finally {
                    this.locked = false;
                    const next = this.queue.shift();
                    if (next) {
                        next();
                    }
                }
            };
            if (this.locked) {
                this.queue.push(execute);
            }
            else {
                this.locked = true;
                execute();
            }
        });
    }
}
//# sourceMappingURL=remote-state.js.map