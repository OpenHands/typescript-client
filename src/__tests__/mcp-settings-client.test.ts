import { SettingsClient } from '../client/settings-client';
import type { MCPConfig, MCPServerPatch } from '../models/mcp-settings';

type JsonObject = Record<string, unknown>;

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

function mergePatch(target: JsonObject, patch: JsonObject): JsonObject {
  const result = clone(target);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergePatch(result[key] as JsonObject, value as JsonObject);
    } else {
      result[key] = clone(value);
    }
  }
  return result;
}

function installStatefulSettingsServer(initial: MCPConfig) {
  const catalog = clone(initial) as unknown as JsonObject;
  const fetchMock = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as {
      agent_settings_diff: { mcp_config: Record<string, MCPServerPatch | null> };
    };
    for (const [settingsKey, patch] of Object.entries(request.agent_settings_diff.mcp_config)) {
      if (patch === null) {
        delete catalog[settingsKey];
      } else {
        catalog[settingsKey] = mergePatch(
          (catalog[settingsKey] as JsonObject | undefined) ?? {},
          patch as JsonObject
        );
      }
    }
    return new Response(
      JSON.stringify({
        agent_settings: { mcp_config: catalog },
        conversation_settings: {},
        llm_api_key_is_set: false,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  });
  global.fetch = fetchMock as typeof fetch;
  return {
    fetchMock,
    getCatalog: () => clone(catalog),
  };
}

const initialCatalog = (): MCPConfig => ({
  github: {
    transport: 'http',
    url: 'https://api.githubcopilot.com/mcp/',
    auth: { strategy: 'bearer', value: 'github-secret' },
    headers: { 'X-Existing': 'keep-me', 'X-Remove': 'old' },
  },
  filesystem: {
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace'],
    env: { FILESYSTEM_TOKEN: 'filesystem-secret' },
  },
});

describe('SettingsClient canonical MCP mutations', () => {
  it('adds one named server while preserving siblings and credentials', async () => {
    const server = installStatefulSettingsServer(initialCatalog());
    const client = new SettingsClient({ host: 'http://example.com' });

    await client.patchMcpServer('docs', {
      transport: 'http',
      url: 'https://example.test/mcp',
      auth: { strategy: 'bearer', value: 'docs-secret' },
    });

    expect(server.fetchMock).toHaveBeenCalledTimes(1);
    expect(server.getCatalog()).toMatchObject({
      github: { auth: { strategy: 'bearer', value: 'github-secret' } },
      filesystem: { env: { FILESYSTEM_TOKEN: 'filesystem-secret' } },
      docs: {
        transport: 'http',
        url: 'https://example.test/mcp',
        auth: { strategy: 'bearer', value: 'docs-secret' },
      },
    });
    expect(server.fetchMock).toHaveBeenCalledWith(
      'http://example.com/api/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          agent_settings_diff: {
            mcp_config: {
              docs: {
                transport: 'http',
                url: 'https://example.test/mcp',
                auth: { strategy: 'bearer', value: 'docs-secret' },
              },
            },
          },
        }),
      })
    );
  });

  it('preserves stored auth when a sparse update omits it', async () => {
    const server = installStatefulSettingsServer(initialCatalog());
    const client = new SettingsClient({ host: 'http://example.com' });

    await client.patchMcpServer('github', {
      url: 'https://example.test/github-mcp',
    });

    expect(server.fetchMock).toHaveBeenCalledTimes(1);
    expect(server.getCatalog().github).toMatchObject({
      url: 'https://example.test/github-mcp',
      auth: { strategy: 'bearer', value: 'github-secret' },
    });
  });

  it('replaces and explicitly clears auth', async () => {
    const server = installStatefulSettingsServer(initialCatalog());
    const client = new SettingsClient({ host: 'http://example.com' });

    await client.patchMcpServer('github', {
      auth: { strategy: 'api_key', header_name: 'X-API-Key', value: 'replacement' },
    });
    expect(server.getCatalog().github).toMatchObject({
      auth: { strategy: 'api_key', header_name: 'X-API-Key', value: 'replacement' },
    });

    await client.patchMcpServer('github', { auth: null });
    expect(server.fetchMock).toHaveBeenCalledTimes(2);
    expect(server.getCatalog().github).not.toHaveProperty('auth');
  });

  it('deletes a map entry without altering sibling credentials', async () => {
    const server = installStatefulSettingsServer(initialCatalog());
    const client = new SettingsClient({ host: 'http://example.com' });

    await client.deleteMcpServer('filesystem');

    expect(server.fetchMock).toHaveBeenCalledTimes(1);
    expect(server.getCatalog()).toEqual({
      github: {
        transport: 'http',
        url: 'https://api.githubcopilot.com/mcp/',
        auth: { strategy: 'bearer', value: 'github-secret' },
        headers: { 'X-Existing': 'keep-me', 'X-Remove': 'old' },
      },
    });
    expect(server.fetchMock).toHaveBeenCalledWith(
      'http://example.com/api/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          agent_settings_diff: { mcp_config: { filesystem: null } },
        }),
      })
    );
  });

  it('uses null to delete one nested map value while preserving its siblings', async () => {
    const server = installStatefulSettingsServer(initialCatalog());
    const client = new SettingsClient({ host: 'http://example.com' });

    await client.patchMcpServer('github', {
      headers: { 'X-Remove': null },
    });

    expect(server.fetchMock).toHaveBeenCalledTimes(1);
    expect(server.getCatalog().github).toMatchObject({
      headers: { 'X-Existing': 'keep-me' },
      auth: { strategy: 'bearer', value: 'github-secret' },
    });
    expect(
      (server.getCatalog().github as JsonObject).headers as Record<string, string>
    ).not.toHaveProperty('X-Remove');
  });
});
