/**
 * Conversation manager for handling multiple conversations
 */
import { HttpClient } from '../client/http-client';
import { DesktopClient } from '../client/desktop-client';
import { LLMMetadataClient } from '../client/llm-client';
import { ServerClient } from '../client/server-client';
import { SettingsClient } from '../client/settings-client';
import { SkillsClient } from '../client/skills-client';
import { ToolClient } from '../client/tool-client';
import { VSCodeClient } from '../client/vscode-client';
import { RemoteConversation } from './remote-conversation';
import { RemoteWorkspace } from '../workspace/remote-workspace';
export class ACPConversationNamespace {
    constructor(manager) {
        this.manager = manager;
    }
    searchConversations(options = {}) {
        return this.manager.searchACPConversations(options);
    }
    countConversations(options = {}) {
        return this.manager.countACPConversations(options);
    }
    getConversations(conversationIds) {
        return this.manager.getACPConversations(conversationIds);
    }
    getAllConversations() {
        return this.manager.getAllACPConversations();
    }
    getConversation(conversationId) {
        return this.manager.getACPConversation(conversationId);
    }
    createConversation(agent, options = {}) {
        return this.manager.createACPConversation(agent, options);
    }
}
export class ConversationManager {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: 60000,
        });
        const clientOptions = {
            host: this.host,
            ...(this.apiKey ? { apiKey: this.apiKey } : {}),
        };
        this.server = new ServerClient(clientOptions);
        this.llm = new LLMMetadataClient(clientOptions);
        this.settings = new SettingsClient(clientOptions);
        this.skills = new SkillsClient(clientOptions);
        this.tools = new ToolClient(clientOptions);
        this.vscode = new VSCodeClient(clientOptions);
        this.desktop = new DesktopClient(clientOptions);
        this.acp = new ACPConversationNamespace(this);
    }
    /**
     * Search/list conversations
     */
    async searchConversations(options = {}) {
        const response = await this.client.get('/api/conversations/search', {
            params: options,
        });
        return response.data;
    }
    /**
     * Count conversations matching the provided filters.
     */
    async countConversations(options = {}) {
        const response = await this.client.get('/api/conversations/count', {
            params: options,
        });
        return response.data;
    }
    /**
     * Batch get conversations by ID.
     */
    async getConversations(conversationIds) {
        const response = await this.client.get('/api/conversations', {
            params: { ids: conversationIds },
        });
        return response.data;
    }
    /**
     * Get all conversations (convenience method)
     */
    async getAllConversations(options) {
        const conversations = [];
        let nextPageId;
        do {
            const response = await this.searchConversations({
                page_id: nextPageId,
                limit: 100,
                ...(options?.tag ? { tag: options.tag } : {}),
            });
            conversations.push(...response.items);
            nextPageId = response.next_page_id;
        } while (nextPageId);
        return conversations;
    }
    /**
     * Get a specific conversation by ID
     */
    async getConversation(conversationId) {
        const response = await this.client.get(`/api/conversations/${conversationId}`);
        return response.data;
    }
    /**
     * Create a new conversation
     */
    async createConversation(agent, options = {}) {
        const workspace = new RemoteWorkspace({
            host: this.host,
            workingDir: options.workingDir || '/tmp',
            apiKey: this.apiKey,
        });
        const conversation = new RemoteConversation(agent, workspace, {
            maxIterations: options.maxIterations,
            stuckDetection: options.stuckDetection,
        });
        await conversation.start({
            initialMessage: options.initialMessage,
        });
        return conversation;
    }
    /**
     * Load an existing conversation
     */
    async loadConversation(conversationId, workingDir = '/tmp') {
        const conversationInfo = await this.getConversation(conversationId);
        const workspace = new RemoteWorkspace({
            host: this.host,
            workingDir,
            apiKey: this.apiKey,
        });
        const conversation = new RemoteConversation(conversationInfo.agent, workspace, {
            conversationId,
        });
        await conversation.start();
        return conversation;
    }
    /**
     * Search ACP-capable conversations.
     */
    async searchACPConversations(options = {}) {
        const response = await this.client.get('/api/acp/conversations/search', {
            params: options,
        });
        return response.data;
    }
    /**
     * Count ACP-capable conversations.
     */
    async countACPConversations(options = {}) {
        const response = await this.client.get('/api/acp/conversations/count', {
            params: options,
        });
        return response.data;
    }
    /**
     * Batch get ACP-capable conversations by ID.
     */
    async getACPConversations(conversationIds) {
        const response = await this.client.get('/api/acp/conversations', {
            params: { ids: conversationIds },
        });
        return response.data;
    }
    /**
     * Get all ACP-capable conversations (convenience method).
     */
    async getAllACPConversations() {
        const conversations = [];
        let nextPageId;
        do {
            const response = await this.searchACPConversations({
                page_id: nextPageId,
                limit: 100,
            });
            conversations.push(...response.items);
            nextPageId = response.next_page_id;
        } while (nextPageId);
        return conversations;
    }
    /**
     * Get a specific ACP-capable conversation by ID.
     */
    async getACPConversation(conversationId) {
        const response = await this.client.get(`/api/acp/conversations/${conversationId}`);
        return response.data;
    }
    /**
     * Create a new ACP-capable conversation.
     */
    async createACPConversation(agent, options = {}) {
        let initialMessage;
        if (options.initialMessage) {
            initialMessage = {
                role: 'user',
                content: [{ type: 'text', text: options.initialMessage }],
            };
        }
        const request = {
            agent,
            initial_message: initialMessage,
            max_iterations: options.maxIterations || 500,
            stuck_detection: options.stuckDetection ?? true,
            workspace: { type: 'local', working_dir: options.workingDir || '/tmp' },
        };
        const response = await this.client.post('/api/acp/conversations', request);
        return response.data;
    }
    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId) {
        await this.client.delete(`/api/conversations/${conversationId}`);
    }
    /**
     * Update conversation metadata (e.g. title)
     */
    async updateConversation(conversationId, update) {
        const response = await this.client.patch(`/api/conversations/${conversationId}`, update);
        return response.data;
    }
    /**
     * Close the manager and cleanup resources
     */
    close() {
        this.server.close();
        this.llm.close();
        this.settings.close();
        this.skills.close();
        this.tools.close();
        this.vscode.close();
        this.desktop.close();
        this.client.close();
    }
}
//# sourceMappingURL=conversation-manager.js.map