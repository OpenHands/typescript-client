/**
 * Tests for liftAgentContextSecrets — the TypeScript equivalent of Python SDK's
 * _start_request_kwargs(): promotes agent_context.secrets into the top-level
 * request.secrets field so the agent-server seeds secret_registry from them.
 */

import { liftAgentContextSecrets } from '../models/conversation';
import type { AgentBase, AgentContext } from '../types/base';
import type { SecretObject, StaticSecret } from '../models/conversation';

function staticSecret(value: string): StaticSecret {
  return { kind: 'StaticSecret', value };
}

function makeAgent(contextSecrets?: Record<string, SecretObject>): AgentBase {
  const agentContext: AgentContext & { secrets?: Record<string, SecretObject> } = contextSecrets
    ? { secrets: contextSecrets }
    : {};
  return {
    kind: 'acp',
    llm: { model: 'claude-sonnet-4-5' },
    agent_context: agentContext,
  };
}

describe('liftAgentContextSecrets', () => {
  it('returns empty object when agent has no context secrets and no panel secrets', () => {
    const agent = makeAgent();
    expect(liftAgentContextSecrets(agent)).toEqual({});
  });

  it('returns empty object when agent_context is null', () => {
    const agent: AgentBase = { kind: 'acp', llm: { model: 'claude-sonnet-4-5' }, agent_context: null };
    expect(liftAgentContextSecrets(agent)).toEqual({});
  });

  it('lifts agent_context.secrets into result', () => {
    const cred = staticSecret('sk-provider-key');
    const agent = makeAgent({ ANTHROPIC_API_KEY: cred });

    const result = liftAgentContextSecrets(agent);

    expect(result).toEqual({ ANTHROPIC_API_KEY: cred });
  });

  it('panel secrets win when they conflict with agent_context secrets (mirror SDK merge order)', () => {
    const providerCred = staticSecret('sk-provider-key');
    const panelCred = staticSecret('sk-panel-key');
    const agent = makeAgent({ ANTHROPIC_API_KEY: providerCred });

    const result = liftAgentContextSecrets(agent, { ANTHROPIC_API_KEY: panelCred });

    expect(result['ANTHROPIC_API_KEY']).toBe(panelCred);
  });

  it('non-conflicting panel secrets are merged alongside agent_context secrets', () => {
    const providerCred = staticSecret('sk-provider-key');
    const githubToken = staticSecret('ghp-panel');
    const agent = makeAgent({ ANTHROPIC_API_KEY: providerCred });

    const result = liftAgentContextSecrets(agent, { GITHUB_TOKEN: githubToken });

    expect(result['ANTHROPIC_API_KEY']).toBe(providerCred);
    expect(result['GITHUB_TOKEN']).toBe(githubToken);
  });

  it('returns only panel secrets when agent has no context secrets', () => {
    const panelCred = staticSecret('sk-panel-key');
    const agent = makeAgent();

    const result = liftAgentContextSecrets(agent, { ANTHROPIC_API_KEY: panelCred });

    expect(result).toEqual({ ANTHROPIC_API_KEY: panelCred });
  });

  it('does not mutate agent or panelSecrets', () => {
    const providerCred = staticSecret('sk-provider-key');
    const panelSecrets: Record<string, SecretObject> = { GITHUB_TOKEN: staticSecret('ghp') };
    const agent = makeAgent({ ANTHROPIC_API_KEY: providerCred });
    const originalContext = { ...(agent.agent_context as AgentContext & { secrets: Record<string, SecretObject> }).secrets };
    const originalPanel = { ...panelSecrets };

    liftAgentContextSecrets(agent, panelSecrets);

    expect((agent.agent_context as AgentContext & { secrets: Record<string, SecretObject> }).secrets).toEqual(originalContext);
    expect(panelSecrets).toEqual(originalPanel);
  });
});
