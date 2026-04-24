/**
 * Conversation factory and utility functions
 *
 * This module provides a convenient factory pattern for creating conversation instances.
 * It matches the Python SDK pattern while supporting both local and remote conversations.
 */
import { RemoteWorkspace } from '../workspace/remote-workspace';
import { LocalWorkspace } from '../workspace/local-workspace';
import { RemoteConversation } from './remote-conversation';
import { LocalConversation } from './local-conversation';
/**
 * Conversation class that extends RemoteConversation for backwards compatibility.
 * Provides a cleaner API that matches the Python SDK naming.
 *
 * For new code, consider using the createConversation factory function
 * or directly instantiating RemoteConversation or LocalConversation.
 *
 * Usage:
 * ```typescript
 * // Legacy usage (backwards compatible)
 * const conversation = new Conversation(agent, workspace);
 * await conversation.start();
 *
 * // For existing conversations:
 * const conversation = new Conversation(agent, workspace, { conversationId: 'existing-id' });
 * await conversation.start();
 * ```
 */
export class Conversation extends RemoteConversation {
    constructor(agent, workspace, options) {
        super(agent, workspace, options);
    }
}
/**
 * Factory function to create a conversation instance based on options.
 *
 * This provides a unified way to create either local or remote conversations
 * based on the provided options.
 *
 * Usage:
 * ```typescript
 * // Create a remote conversation
 * const remoteConversation = createConversation({
 *   type: 'remote',
 *   agent: myAgent,
 *   workspace: remoteWorkspace,
 *   options: { callback: (event) => console.log(event) }
 * });
 *
 * // Create a local conversation
 * const localConversation = createConversation({
 *   type: 'local',
 *   agent: myAgent,
 *   workspace: localWorkspace,
 *   options: { persistenceDir: '/path/to/persistence' }
 * });
 * ```
 *
 * @param config - The conversation configuration including type, agent, workspace, and options
 * @returns A conversation instance implementing IConversation
 */
export function createConversation(config) {
    switch (config.type) {
        case 'remote':
            if (!(config.workspace instanceof RemoteWorkspace)) {
                throw new Error('Remote conversation requires RemoteWorkspace');
            }
            return new RemoteConversation(config.agent, config.workspace, config.options);
        case 'local':
            return new LocalConversation(config.agent, config.workspace, config.options);
        default:
            throw new Error(`Unknown conversation type: ${config.type}`);
    }
}
/**
 * Create a conversation automatically detecting the type from workspace.
 *
 * If the workspace is a RemoteWorkspace, creates a RemoteConversation.
 * If the workspace is a LocalWorkspace, creates a LocalConversation.
 *
 * Usage:
 * ```typescript
 * // Automatically creates RemoteConversation
 * const remote = createConversationAuto(agent, remoteWorkspace);
 *
 * // Automatically creates LocalConversation
 * const local = createConversationAuto(agent, localWorkspace);
 * ```
 *
 * @param agent - The agent to use for the conversation
 * @param workspace - The workspace (determines conversation type)
 * @param options - Optional conversation configuration
 * @returns A conversation instance implementing IConversation
 */
export function createConversationAuto(agent, workspace, options) {
    if (workspace instanceof RemoteWorkspace) {
        return new RemoteConversation(agent, workspace, options);
    }
    if (workspace instanceof LocalWorkspace) {
        return new LocalConversation(agent, workspace, options);
    }
    throw new Error('Workspace must be either RemoteWorkspace or LocalWorkspace');
}
//# sourceMappingURL=conversation.js.map