import {
  BashClient,
  HttpClient,
  ServerClient,
  SkillsClient,
} from '../index';

const originalFetch = global.fetch;

describe('Auxiliary API clients', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('ServerClient.getReady accepts a 503 readiness response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'initializing', message: 'Booting' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const client = new ServerClient({ host: 'http://example.com' });
    const ready = await client.getReady();

    expect(ready.status).toBe('initializing');
    expect(ready.message).toBe('Booting');
  });

  it('SkillsClient.syncSkills posts to the sync endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const client = new SkillsClient({ host: 'http://example.com' });
    const response = await client.syncSkills();

    expect(response.status).toBe('success');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/skills/sync',
      expect.objectContaining({
        method: 'POST',
        body: '{}',
      })
    );
  });

  it('BashClient.startCommand normalizes string requests', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'bash-command-1',
          timestamp: new Date().toISOString(),
          command: 'echo hi',
          cwd: '/tmp',
          timeout: 3,
          kind: 'BashCommand',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    ) as typeof fetch;

    const client = new BashClient({ host: 'http://example.com' });
    const result = await client.startCommand('echo hi', '/tmp', 3.8);

    expect(result.command).toBe('echo hi');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/bash/start_bash_command',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ command: 'echo hi', cwd: '/tmp', timeout: 3 }),
      })
    );
  });

  it('HttpClient can parse blob responses when requested', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(new Blob(['zip-data']), {
        status: 200,
        headers: { 'content-type': 'application/zip' },
      })
    ) as typeof fetch;

    const client = new HttpClient({ baseUrl: 'http://example.com' });
    const response = await client.get<Blob>('/download.zip', { responseType: 'blob' });

    expect(response.data).toBeInstanceOf(Blob);
    expect(await response.data.text()).toBe('zip-data');
  });
});
