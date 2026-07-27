const SESSION_KEY = `sk-oh-${'a'.repeat(64)}`;

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readonly send = jest.fn();
  readonly close = jest.fn();
  onopen?: () => void;
  onmessage?: (event: { data: unknown }) => void;
  onclose?: () => void;
  onerror?: () => void;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

const mockWebSocketImplementation = (): void => {
  jest.doMock('ws', () => MockWebSocket);
};

describe('WebSocket authentication', () => {
  beforeEach(() => {
    jest.resetModules();
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    jest.dontMock('ws');
  });

  it('sends conversation auth in the first frame instead of the URL', () => {
    jest.isolateModules(() => {
      mockWebSocketImplementation();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { WebSocketCallbackClient } = require('../events/websocket-client');
      const client = new WebSocketCallbackClient({
        host: 'https://runtime.example.com',
        conversationId: 'conv-1',
        callback: () => {},
        apiKey: SESSION_KEY,
      });

      client.start();
      const socket = MockWebSocket.instances[0];
      socket.onopen?.();

      expect(socket.url).toBe('wss://runtime.example.com/sockets/events/conv-1');
      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'auth', session_api_key: SESSION_KEY })
      );

      client.stop();
    });
  });

  it('sends bash auth in the first frame while preserving resend options', () => {
    jest.isolateModules(() => {
      mockWebSocketImplementation();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BashWebSocketClient } = require('../events/bash-websocket-client');
      const client = new BashWebSocketClient({
        host: 'https://runtime.example.com',
        callback: () => {},
        apiKey: SESSION_KEY,
        resendMode: 'all',
      });

      client.start();
      const socket = MockWebSocket.instances[0];
      socket.onopen?.();

      expect(socket.url).toBe('wss://runtime.example.com/sockets/bash-events?resend_mode=all');
      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'auth', session_api_key: SESSION_KEY })
      );

      client.stop();
    });
  });
});
