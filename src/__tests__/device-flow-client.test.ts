import { CloudClient, pollForToken } from '../clients';

const originalFetch = global.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('device flow request metadata', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('CloudClient forwards additional headers when starting authorization', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        device_code: 'device-code',
        user_code: 'user-code',
        verification_uri: 'https://cloud.example.com/device',
        expires_in: 600,
        interval: 5,
      })
    ) as typeof fetch;
    const client = new CloudClient({ host: 'https://cloud.example.com' });

    await client.startDeviceFlow({
      headers: { 'X-OpenHands-Client': 'agent_canvas' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cloud.example.com/oauth/device/authorize',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-OpenHands-Client': 'agent_canvas',
        },
      })
    );
  });

  it('forwards additional headers while polling for a token', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ access_token: 'token', token_type: 'Bearer' })
      ) as typeof fetch;

    await pollForToken('https://cloud.example.com', 'device-code', {
      interval: 1,
      headers: { 'X-OpenHands-Client-Version': '1.4.0' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cloud.example.com/oauth/device/token',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-OpenHands-Client-Version': '1.4.0',
        },
      })
    );
  });
});
