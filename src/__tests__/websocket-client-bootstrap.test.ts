/**
 * Regression tests for the WebSocket client module-load behaviour.
 *
 * Background: Prior to PR #156 both `events/websocket-client.ts` and
 * `events/bash-websocket-client.ts` ran an `if (typeof window !== 'undefined')
 * { ... } else { require('ws') }` block at module load. Because the package
 * is published as ESM (`"type": "module"`), `require` is undefined at runtime,
 * so the fallback threw "WebSocket implementation not available. Install ws
 * package for Node.js environments." on import — breaking every Node.js ESM
 * consumer, regardless of whether they ever opened a WebSocket.
 *
 * The default Jest environment is `testEnvironment: 'node'` running under
 * CommonJS via ts-jest, so `require('ws')` *succeeded* in tests and hid the
 * bug from CI. These tests explicitly remove `globalThis.WebSocket` and
 * reload the modules in isolation so the regression cannot return.
 */

const MODULES = ['../events/websocket-client', '../events/bash-websocket-client'] as const;

// `globalThis.WebSocket` is declared non-optional in the DOM lib, so `delete`
// needs to go through a Record cast to satisfy TS' strict optional check.
type GlobalRecord = Record<string, unknown>;

const setGlobalWebSocket = (value: unknown): void => {
  (globalThis as unknown as GlobalRecord).WebSocket = value;
};

const deleteGlobalWebSocket = (): void => {
  delete (globalThis as unknown as GlobalRecord).WebSocket;
};

const withoutGlobalWebSocket = (fn: () => void): void => {
  const g = globalThis as unknown as GlobalRecord;
  const hadWebSocket = Object.prototype.hasOwnProperty.call(g, 'WebSocket');
  const original = g.WebSocket;
  deleteGlobalWebSocket();
  try {
    jest.isolateModules(fn);
  } finally {
    if (hadWebSocket) {
      setGlobalWebSocket(original);
    } else {
      deleteGlobalWebSocket();
    }
  }
};

describe('WebSocket client module loading', () => {
  describe.each(MODULES)('%s', (modulePath) => {
    it('does not throw at module load when globalThis.WebSocket is undefined', () => {
      expect(() => {
        withoutGlobalWebSocket(() => {
          // Simulate the real ESM-consumer environment where `require('ws')`
          // is unavailable / throws. In Jest's default CJS runtime, the
          // `ws` package resolves fine, which is why the old broken code
          // (`try { require('ws') } catch { throw ... }`) accidentally
          // passed under CI even though every real Node.js ESM consumer hit
          // the throw. We force the require call to throw here so the test
          // exercises the same code path the published package does.
          jest.doMock('ws', () => {
            throw new Error('ws is not available in this environment');
          });
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require(modulePath);
        });
      }).not.toThrow();
    });
  });

  it('reports a clear error via onError when start() is called without globalThis.WebSocket', () => {
    let captured: Error | undefined;

    withoutGlobalWebSocket(() => {
      // See the note above on `jest.doMock('ws', ...)` — we also block the
      // `ws` fallback here so the regression test mirrors what real Node.js
      // ESM consumers experience.
      jest.doMock('ws', () => {
        throw new Error('ws is not available in this environment');
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WebSocketCallbackClient } = require('../events/websocket-client');
      const client = new WebSocketCallbackClient({
        host: 'http://example.com',
        conversationId: 'conv-1',
        callback: () => {},
        onError: (err: Error) => {
          captured = err;
        },
      });
      try {
        client.start();
      } finally {
        client.stop();
      }
    });

    expect(captured).toBeInstanceOf(Error);
    expect(captured?.message).toMatch(/No WebSocket implementation found on globalThis/i);
    // The old "Install ws package for Node.js environments." message must never
    // come back — its return would signal a re-introduction of the require('ws')
    // fallback or another module-load throw.
    expect(captured?.message).not.toMatch(/Install ws package/i);
  });

  it('uses the WebSocket constructor available on globalThis when one is present', () => {
    const g = globalThis as unknown as GlobalRecord;
    const hadWebSocket = Object.prototype.hasOwnProperty.call(g, 'WebSocket');
    const original = g.WebSocket;

    const calls: string[] = [];
    class FakeWebSocket {
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(url: string) {
        calls.push(url);
      }
      close(): void {}
    }
    setGlobalWebSocket(FakeWebSocket);

    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { WebSocketCallbackClient } = require('../events/websocket-client');
        const client = new WebSocketCallbackClient({
          host: 'http://example.com',
          conversationId: 'conv-xyz',
          callback: () => {},
          apiKey: 'secret-key',
        });
        try {
          client.start();
        } finally {
          client.stop();
        }
      });
    } finally {
      if (hadWebSocket) {
        setGlobalWebSocket(original);
      } else {
        deleteGlobalWebSocket();
      }
    }

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe('ws://example.com/sockets/events/conv-xyz?session_api_key=secret-key');
  });
});
