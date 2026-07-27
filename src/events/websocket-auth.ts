const WEBSOCKET_AUTH_TYPE = 'auth';
const WEBSOCKET_SESSION_KEY_FIELD = 'session_api_key';

export function sendWebSocketAuth(socket: { send(data: string): void }, apiKey?: string): void {
  if (!apiKey) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: WEBSOCKET_AUTH_TYPE,
      [WEBSOCKET_SESSION_KEY_FIELD]: apiKey,
    })
  );
}
