import {
  ACP_PROVIDERS,
  getACPProvider,
  detectACPProviderByAgentName,
  buildSessionModelMeta,
} from '../index';
import type { ACPProviderInfo, ACPServerKind } from '../index';

describe('ACP_PROVIDERS', () => {
  it('exposes the three built-in providers in stable order', () => {
    expect(Object.keys(ACP_PROVIDERS)).toEqual(['claude-code', 'codex', 'gemini-cli']);
  });

  it('uses the package names the SDK ships with — drift here breaks real spawns', () => {
    // These are the only invocations that actually start an ACP server in the
    // current ecosystem; the npm packages that look related but ARE NOT
    // ACP servers (e.g. `@openai/codex acp` which is interactive-only) used
    // to leak into this registry and silently deadlocked the agent loop.
    expect(ACP_PROVIDERS['claude-code'].defaultCommand).toEqual([
      'npx',
      '-y',
      '@agentclientprotocol/claude-agent-acp',
    ]);
    expect(ACP_PROVIDERS['codex'].defaultCommand).toEqual([
      'npx',
      '-y',
      '@zed-industries/codex-acp',
    ]);
    expect(ACP_PROVIDERS['gemini-cli'].defaultCommand).toEqual([
      'npx',
      '-y',
      '@google/gemini-cli',
      '--acp',
    ]);
  });

  it('pairs each provider with its API-key + base-URL env vars', () => {
    expect(ACP_PROVIDERS['claude-code'].apiKeyEnvVar).toBe('ANTHROPIC_API_KEY');
    expect(ACP_PROVIDERS['claude-code'].baseUrlEnvVar).toBe('ANTHROPIC_BASE_URL');
    expect(ACP_PROVIDERS['codex'].apiKeyEnvVar).toBe('OPENAI_API_KEY');
    expect(ACP_PROVIDERS['codex'].baseUrlEnvVar).toBe('OPENAI_BASE_URL');
    expect(ACP_PROVIDERS['gemini-cli'].apiKeyEnvVar).toBe('GEMINI_API_KEY');
    expect(ACP_PROVIDERS['gemini-cli'].baseUrlEnvVar).toBe('GEMINI_BASE_URL');
  });

  it('declares the right session-mode + model-selection protocol per provider', () => {
    // claude-agent-acp selects models via session _meta, not set_session_model
    expect(ACP_PROVIDERS['claude-code'].supportsSetSessionModel).toBe(false);
    expect(ACP_PROVIDERS['claude-code'].sessionMetaKey).toBe('claudeCode');
    expect(ACP_PROVIDERS['claude-code'].defaultSessionMode).toBe('bypassPermissions');

    // codex-acp + gemini-cli select via set_session_model
    expect(ACP_PROVIDERS['codex'].supportsSetSessionModel).toBe(true);
    expect(ACP_PROVIDERS['codex'].sessionMetaKey).toBeNull();
    expect(ACP_PROVIDERS['codex'].defaultSessionMode).toBe('full-access');

    expect(ACP_PROVIDERS['gemini-cli'].supportsSetSessionModel).toBe(true);
    expect(ACP_PROVIDERS['gemini-cli'].sessionMetaKey).toBeNull();
    expect(ACP_PROVIDERS['gemini-cli'].defaultSessionMode).toBe('yolo');
  });

  it('is frozen — callers cannot mutate the registry by accident', () => {
    expect(Object.isFrozen(ACP_PROVIDERS)).toBe(true);
    expect(Object.isFrozen(ACP_PROVIDERS['codex'])).toBe(true);
    expect(Object.isFrozen(ACP_PROVIDERS['codex'].defaultCommand)).toBe(true);
  });
});

describe('getACPProvider', () => {
  it('returns the matching provider info for a known key', () => {
    const info = getACPProvider('claude-code');
    expect(info?.displayName).toBe('Claude Code');
  });

  it('returns undefined for an unknown key', () => {
    expect(getACPProvider('definitely-not-a-provider')).toBeUndefined();
    // ``custom`` is a discriminator value but intentionally NOT in the
    // registry — the user supplies their own ``acp_command``.
    expect(getACPProvider('custom')).toBeUndefined();
  });

  it('accepts an ACPServerKind without a type assertion', () => {
    const kind: ACPServerKind = 'codex';
    const info: ACPProviderInfo | undefined = getACPProvider(kind);
    expect(info?.key).toBe('codex');
  });
});

describe('detectACPProviderByAgentName', () => {
  it('matches by lowercased substring of the runtime agent_name', () => {
    expect(detectACPProviderByAgentName('claude-agent-acp')?.key).toBe('claude-code');
    expect(detectACPProviderByAgentName('Claude-Agent-ACP')?.key).toBe('claude-code');
    expect(detectACPProviderByAgentName('codex-acp')?.key).toBe('codex');
    expect(detectACPProviderByAgentName('gemini-cli')?.key).toBe('gemini-cli');
  });

  it('returns undefined when no pattern matches', () => {
    expect(detectACPProviderByAgentName('some-custom-agent')).toBeUndefined();
  });
});

describe('buildSessionModelMeta', () => {
  it('returns a _meta block for providers with a session_meta_key', () => {
    expect(buildSessionModelMeta('claude-agent-acp', 'claude-opus-4-5')).toEqual({
      claudeCode: { options: { model: 'claude-opus-4-5' } },
    });
  });

  it('returns an empty object when the provider uses set_session_model', () => {
    expect(buildSessionModelMeta('codex-acp', 'gpt-5.4')).toEqual({});
    expect(buildSessionModelMeta('gemini-cli', 'gemini-2.0-pro')).toEqual({});
  });

  it('returns an empty object when acp_model is null/empty', () => {
    expect(buildSessionModelMeta('claude-agent-acp', null)).toEqual({});
    expect(buildSessionModelMeta('claude-agent-acp', undefined)).toEqual({});
    expect(buildSessionModelMeta('claude-agent-acp', '')).toEqual({});
  });

  it('returns an empty object when the agent name is unrecognised', () => {
    expect(buildSessionModelMeta('some-unknown-agent', 'model')).toEqual({});
  });
});
