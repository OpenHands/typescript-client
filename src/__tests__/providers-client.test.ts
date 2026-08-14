/**
 * Tests for the Model Provider client methods on LLMMetadataClient.
 *
 * Verifies each /api/llm/model-providers endpoint is hit with the right method,
 * path, and body, and that responses are unpacked correctly. The key is never
 * echoed by the server (api_key_set only), so no key handling is asserted here.
 */

import { LLMMetadataClient } from '../client/llm-client';
import type { ModelProvider, TestProviderResponse } from '../models/api';

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

describe('LLMMetadataClient model providers', () => {
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

  it('listProviders GETs /api/llm/model-providers and returns the array', async () => {
    const providers: ModelProvider[] = [
      {
        id: 'abc',
        display_name: 'OpenAI',
        kind: 'openai',
        base_url: 'https://api.openai.com/v1',
        wire_api: 'chat',
        custom_headers: { 'X-Org': 'eng' },
        models: [{ name: 'gpt-5.6-luna', wire_api: null }],
        created_at: 1700000000,
        updated_at: 1700000100,
        api_key_set: true,
      },
    ];
    global.fetch = mockFetch(providers);

    const result = await client.listProviders();
    expect(result).toEqual(providers);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/model-providers',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('createProvider POSTs body to /api/llm/model-providers', async () => {
    const created: ModelProvider = {
      id: 'abc',
      display_name: 'OpenAI',
      kind: 'openai',
      base_url: 'https://api.openai.com/v1',
      wire_api: 'responses',
      custom_headers: { 'X-Org': 'eng' },
      models: [],
      created_at: 1700000000,
      updated_at: 1700000000,
      api_key_set: true,
    };
    global.fetch = mockFetch(created, 201);

    const result = await client.createProvider({
      display_name: 'OpenAI',
      kind: 'openai',
      key: 'sk-test',
      base_url: 'https://api.openai.com/v1',
      wire_api: 'responses',
      custom_headers: { 'X-Org': 'eng' },
    });
    expect(result).toEqual(created);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/model-providers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          display_name: 'OpenAI',
          kind: 'openai',
          key: 'sk-test',
          base_url: 'https://api.openai.com/v1',
          wire_api: 'responses',
          custom_headers: { 'X-Org': 'eng' },
        }),
      })
    );
  });

  it('getProvider GETs /api/llm/model-providers/{id}', async () => {
    const provider: ModelProvider = {
      id: 'abc',
      display_name: 'OpenAI',
      kind: 'openai',
      wire_api: 'auto',
      custom_headers: {},
      models: [],
      created_at: 1,
      updated_at: 1,
      api_key_set: true,
    };
    global.fetch = mockFetch(provider);

    await client.getProvider('abc');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/model-providers/abc',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('updateProvider PATCHes {id} with the partial body', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.updateProvider('abc', {
      display_name: 'Work OpenAI',
      base_url: 'https://proxy.example/v1',
      wire_api: 'chat',
      custom_headers: { 'X-Org': 'eng' },
    });
    expect(calls[0].url).toBe('http://example.com/api/llm/model-providers/abc');
    expect(calls[0].init?.method).toBe('PATCH');
    expect(calls[0].init?.body).toBe(
      JSON.stringify({
        display_name: 'Work OpenAI',
        base_url: 'https://proxy.example/v1',
        wire_api: 'chat',
        custom_headers: { 'X-Org': 'eng' },
      })
    );
  });

  it('updateProvider can rotate the key', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.updateProvider('abc', { key: 'sk-new' });
    expect(calls[0].init?.method).toBe('PATCH');
    expect(calls[0].init?.body).toBe(JSON.stringify({ key: 'sk-new' }));
  });

  it('deleteProvider DELETEs {id} and returns the removed provider', async () => {
    const removed: ModelProvider = {
      id: 'abc',
      display_name: 'OpenAI',
      kind: 'openai',
      wire_api: 'auto',
      custom_headers: {},
      models: [],
      created_at: 1,
      updated_at: 1,
      api_key_set: false,
    };
    global.fetch = mockFetch(removed);

    const result = await client.deleteProvider('abc');
    expect(result).toEqual(removed);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/model-providers/abc',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('addProviderModel POSTs the model body to {id}/models', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.addProviderModel('abc', { name: 'gpt-5.6-sol' });
    expect(calls[0].url).toBe('http://example.com/api/llm/model-providers/abc/models');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBe(JSON.stringify({ name: 'gpt-5.6-sol' }));
  });

  it('updateProviderModel PATCHes {id}/models/{name} with the payload', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.updateProviderModel('abc', 'gpt-5.6-sol', {
      name: 'gpt-5.6-terra',
      wire_api: 'responses',
    });
    expect(calls[0].url).toBe(
      'http://example.com/api/llm/model-providers/abc/models/gpt-5.6-sol'
    );
    expect(calls[0].init?.method).toBe('PATCH');
    expect(calls[0].init?.body).toBe(
      JSON.stringify({ name: 'gpt-5.6-terra', wire_api: 'responses' })
    );
  });

  it('removeProviderModel DELETEs {id}/models/{name}', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.removeProviderModel('abc', 'gpt-5.6-sol');
    expect(calls[0].url).toBe(
      'http://example.com/api/llm/model-providers/abc/models/gpt-5.6-sol'
    );
    expect(calls[0].init?.method).toBe('DELETE');
  });

  it('testProvider POSTs to {id}/test and returns the probe result', async () => {
    const probe: TestProviderResponse = {
      id: 'abc',
      ok: true,
      verified: false,
      suggested_models: ['gpt-5.6-luna', 'gpt-5.6-sol'],
      error: null,
    };
    global.fetch = mockFetch(probe);

    const result = await client.testProvider('abc');
    expect(result).toEqual(probe);
    expect(result.verified).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/llm/model-providers/abc/test',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('surfaces a typed HttpError with the server body on a non-2xx response', async () => {
    global.fetch = mockFetch({ detail: 'provider unknown' }, 400);

    await expect(client.listProviders()).rejects.toMatchObject({
      name: 'HttpError',
      status: 400,
      response: { detail: 'provider unknown' },
    });
  });

  it('encodes the provider id and model name in the path', async () => {
    const { fetch, calls } = captureFetch();
    global.fetch = fetch;

    await client.removeProviderModel('a/b c', 'x/y z');
    expect(calls[0].url).toBe(
      'http://example.com/api/llm/model-providers/a%2Fb%20c/models/x%2Fy%20z'
    );
  });
});
