import { RemoteWorkspace } from '../index';

const originalFetch = global.fetch;

describe('RemoteWorkspace.downloadAndSave environment guard', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws a clear error in non-browser (Node.js) environments without making a request', async () => {
    // In the Jest "node" test environment there is no global `document`.
    expect(typeof document).toBe('undefined');

    const fetchMock = jest.fn() as jest.Mock;
    global.fetch = fetchMock as typeof fetch;

    const ws = new RemoteWorkspace({ host: 'http://example.com', workingDir: '/tmp' });

    await expect(ws.downloadAndSave('/repo/file.txt')).rejects.toThrow(
      'downloadAndSave() is only available in browser environments. ' +
        'Use downloadAsBlob() or downloadAsText() in Node.js.'
    );

    // The guard runs before any download, so the network is never touched.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('triggers an anchor download when a browser-like environment is present', async () => {
    const ws = new RemoteWorkspace({ host: 'http://example.com', workingDir: '/tmp' });

    // Isolate the DOM logic from the network layer.
    const blob = new Blob(['hello']);
    jest.spyOn(ws, 'downloadAsBlob').mockResolvedValue(blob);

    const anchor = { href: '', download: '', click: jest.fn() };
    const createElement = jest.fn().mockReturnValue(anchor);
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    const createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = jest.fn();

    (globalThis as Record<string, unknown>).document = {
      createElement,
      body: { appendChild, removeChild },
    };
    const originalCreate = (URL as { createObjectURL?: unknown }).createObjectURL;
    const originalRevoke = (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    (URL as unknown as Record<string, unknown>).createObjectURL = createObjectURL;
    (URL as unknown as Record<string, unknown>).revokeObjectURL = revokeObjectURL;

    try {
      await ws.downloadAndSave('/repo/report.txt');

      expect(createElement).toHaveBeenCalledWith('a');
      expect(anchor.href).toBe('blob:mock-url');
      expect(anchor.download).toBe('report.txt');
      expect(anchor.click).toHaveBeenCalledTimes(1);
      expect(appendChild).toHaveBeenCalledWith(anchor);
      expect(removeChild).toHaveBeenCalledWith(anchor);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    } finally {
      delete (globalThis as Record<string, unknown>).document;
      (URL as unknown as Record<string, unknown>).createObjectURL = originalCreate;
      (URL as unknown as Record<string, unknown>).revokeObjectURL = originalRevoke;
    }
  });

  it('honors an explicit saveAsFileName', async () => {
    const ws = new RemoteWorkspace({ host: 'http://example.com', workingDir: '/tmp' });
    jest.spyOn(ws, 'downloadAsBlob').mockResolvedValue(new Blob(['data']));

    const anchor = { href: '', download: '', click: jest.fn() };
    (globalThis as Record<string, unknown>).document = {
      createElement: jest.fn().mockReturnValue(anchor),
      body: { appendChild: jest.fn(), removeChild: jest.fn() },
    };
    const originalCreate = (URL as { createObjectURL?: unknown }).createObjectURL;
    const originalRevoke = (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    (URL as unknown as Record<string, unknown>).createObjectURL = jest
      .fn()
      .mockReturnValue('blob:x');
    (URL as unknown as Record<string, unknown>).revokeObjectURL = jest.fn();

    try {
      await ws.downloadAndSave('/repo/report.txt', 'custom-name.txt');
      expect(anchor.download).toBe('custom-name.txt');
    } finally {
      delete (globalThis as Record<string, unknown>).document;
      (URL as unknown as Record<string, unknown>).createObjectURL = originalCreate;
      (URL as unknown as Record<string, unknown>).revokeObjectURL = originalRevoke;
    }
  });
});
