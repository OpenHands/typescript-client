import { HttpClient } from '../client/http-client';
import { RemoteState } from '../conversation/remote-state';
import { ConversationStateUpdateEvent } from '../events/types';

const originalFetch = global.fetch;

/** A fetch mock that fails the test if the network is touched. */
function makeStateWithNoNetwork(): { state: RemoteState; fetchMock: jest.Mock } {
  const fetchMock = jest
    .fn()
    .mockRejectedValue(new Error('network should not be called')) as jest.Mock;
  global.fetch = fetchMock as typeof fetch;
  const client = new HttpClient({ baseUrl: 'http://example.com' });
  return { state: new RemoteState(client, 'abc'), fetchMock };
}

describe('RemoteState.updateStateFromEvent with the canonical ConversationStateUpdateEvent', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('applies a __full_state__ snapshot event and serves it from cache', async () => {
    const { state, fetchMock } = makeStateWithNoNetwork();

    // Uses the deduplicated type from events/types: BaseEvent shape (id/timestamp)
    // plus the optional previous_value field that the old local copy lacked.
    const event: ConversationStateUpdateEvent = {
      id: 'evt-1',
      kind: 'ConversationStateUpdateEvent',
      timestamp: '2024-01-01T00:00:00Z',
      source: 'agent',
      key: '__full_state__',
      value: { full_state: { execution_status: 'running', persistence_dir: '/data/abc' } },
      previous_value: undefined,
    };

    await state.updateStateFromEvent(event);

    await expect(state.getExecutionStatus()).resolves.toBe('running');
    await expect(state.getPersistenceDir()).resolves.toBe('/data/abc');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('applies a single-key update event', async () => {
    const { state } = makeStateWithNoNetwork();

    const event: ConversationStateUpdateEvent = {
      id: 'evt-2',
      kind: 'ConversationStateUpdateEvent',
      timestamp: '2024-01-01T00:00:00Z',
      key: 'execution_status',
      value: 'idle',
    };

    await state.updateStateFromEvent(event);
    await expect(state.getExecutionStatus()).resolves.toBe('idle');
  });

  it('routes ConversationStateUpdateEvent through createStateUpdateCallback', async () => {
    const { state } = makeStateWithNoNetwork();
    const callback = state.createStateUpdateCallback();

    callback({
      id: 'evt-3',
      kind: 'ConversationStateUpdateEvent',
      timestamp: '2024-01-01T00:00:00Z',
      key: 'execution_status',
      value: 'finished',
    } as ConversationStateUpdateEvent);

    // The callback dispatches asynchronously; allow the microtask queue to drain.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(state.getExecutionStatus()).resolves.toBe('finished');
  });
});
