/**
 * Tests for the Provider Connection client methods on LLMMetadataClient.
 *
 * Verifies each /api/llm/connections endpoint is hit with the right method,
 * path, and body, and that responses are unpacked correctly. The key is never
 * echoed by the server (api_key_set only), so no key handling is asserted here.
 */

import { LLMMetadataClient } from '../client/llm-client';
import type {
  ProviderConnection,
  ValidateConnectionResponse,
} from '../models/api';

const originalFetch = global.fetch;

function mockFetch(responseBody: unknown, status = 200): typeof fetch {
  return jest.fn().mockResolvedValue(
    new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  ) as typeof fetch;
}

function captureFetch(): {
  fetch: typeof fetch;
  calls: { url: string; init?: RequestInit }[];
} {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

describe('LLMMetadataClient connections', () => {
  let client: LLMMetadataClient;

  beforeEach(() => {
    client = new LLMMetadataClient({
      host: 'http://example.com',
      apiKey: 'secret',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('listConnections GETs /api/llm/connections and returns the array', async () => {
    const conns: ProviderConnection[] = [
      {
        id: 'abc',
        provider: 'openai',
        label: 'work',
        models: ['gpt-4o'],
        created_at: 1700000000,
        last_validated_at: 1700000100,
        api_key_set: true,
      },
    ];
    global.fetch = mockFetch(conns);

    const result = await client.listConnections();
    expect(result).toEqual(conns);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/connections',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('createConnection POSTs body to /api/llm/connections', async () => {
    const created: ProviderConnection = {
      id: 'abc',
      provider: 'openai',
      models: [],
      created_at: 1700000000,
      api_key_set: true,
    };
    global.fetch = mockFetch(created, 201);

    const result = await client.createConnection({
      provider: 'openai',
      key: 'sk-test',
    });
    expect(result).toEqual(created);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/connections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', key: 'sk-test' }),
      })
    );
  });

  it('getConnection GETs /api/llm/connections/{id}', async () => {
    const conn: ProviderConnection = {
      id: 'abc',
      provider: 'openai',
      models: [],
      created_at: 1,
      api_key_set: true,
    };
    global.fetch = mockFetch(conn);

    await client.getConnection('abc');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/connections/abc',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('updateConnection PATCHes {id} with the partial body', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.updateConnection('abc', { label: 'work', models: ['gpt-4o'] });
    expect(calls[0].url).toBe('http://example.com/api/llm/connections/abc');
    expect(calls[0].init?.method).toBe('PATCH');
    expect(calls[0].init?.body).toBe(
      JSON.stringify({ label: 'work', models: ['gpt-4o'] })
    );
  });

  it('updateConnection can rotate the key', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.updateConnection('abc', { key: 'sk-new' });
    expect(calls[0].init?.method).toBe('PATCH');
    expect(calls[0].init?.body).toBe(JSON.stringify({ key: 'sk-new' }));
  });

  it('deleteConnection DELETEs {id} and resolves', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await expect(client.deleteConnection('abc')).resolves.toBeUndefined();
    expect(calls[0].url).toBe('http://example.com/api/llm/connections/abc');
    expect(calls[0].init?.method).toBe('DELETE');
  });

  it('validateConnection POSTs to {id}/validate and returns the response', async () => {
    const validate: ValidateConnectionResponse = {
      id: 'abc',
      provider: 'openai',
      ok: true,
      models: ['gpt-4o', 'gpt-4o-mini'],
      error: null,
      validated_at: 1700000200,
    };
    global.fetch = mockFetch(validate);

    const result = await client.validateConnection('abc');
    expect(result).toEqual(validate);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/connections/abc/validate',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('encodes the connection id in the path', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.getConnection('a/b c');
    expect(calls[0].url).toBe(
      'http://example.com/api/llm/connections/a%2Fb%20c'
    );
  });
});
