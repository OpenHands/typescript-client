/** Remote Agent Server conversation factory. */

import { AgentBase } from '../types/base';
import { RemoteWorkspace } from '../workspace/remote-workspace';
import { IConversation } from './base';
import { RemoteConversation, RemoteConversationOptions } from './remote-conversation';

export type ConversationOptions = RemoteConversationOptions;

export interface CreateConversationOptions {
  agent: AgentBase;
  workspace: RemoteWorkspace;
  options?: RemoteConversationOptions;
}

/** Backwards-compatible name for a remote conversation. */
export class Conversation extends RemoteConversation {
  constructor(agent: AgentBase, workspace: RemoteWorkspace, options?: RemoteConversationOptions) {
    super(agent, workspace, options);
  }
}

export function createConversation(config: CreateConversationOptions): IConversation {
  return new RemoteConversation(config.agent, config.workspace, config.options);
}

export function createConversationAuto(
  agent: AgentBase,
  workspace: RemoteWorkspace,
  options?: RemoteConversationOptions
): IConversation {
  return new RemoteConversation(agent, workspace, options);
}
