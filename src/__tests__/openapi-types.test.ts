import { ConversationClient } from '../clients';
import type { CreateConversationPayload } from '../clients';
import type {
  AgentServerConversationInfo,
  SettingsResponse,
  SettingsUpdateRequest,
  StartConversationRequest,
} from '../index';
import type { StartConversationRequest as SubpathStartConversationRequest } from '../generated/agent-server-api';

const originalFetch = global.fetch;

describe('generated Agent Server OpenAPI types', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('types ConversationClient.createConversation with StartConversationRequest', async () => {
    const payload: StartConversationRequest = {
      workspace: { kind: 'LocalWorkspace', working_dir: '/workspace/project' },
      agent_settings: {
        agent_kind: 'openhands',
        llm: { model: 'anthropic/claude-sonnet-4-5-20250929' },
      },
      max_iterations: 500,
      stuck_detection: true,
    };
    const clientPayload: CreateConversationPayload = payload;
    const subpathPayload: SubpathStartConversationRequest = payload;

    const responseBody: Pick<AgentServerConversationInfo, 'id'> = {
      id: '11111111-1111-1111-1111-111111111111',
    };

    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const client = new ConversationClient({ host: 'http://example.com' });
    const conversation = await client.createConversation(clientPayload);

    expect(subpathPayload.agent_settings).toEqual(payload.agent_settings);
    expect(conversation.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/api/conversations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  it('exports generated settings request and response shapes', () => {
    const update: SettingsUpdateRequest = {
      agent_settings_diff: { llm: { model: 'openai/gpt-4o' } },
      conversation_settings_diff: { max_iterations: 200 },
    };
    const response: SettingsResponse = {
      agent_settings: { llm: { model: 'openai/gpt-4o' } },
      conversation_settings: { max_iterations: 200 },
      llm_api_key_is_set: false,
    };

    expect(update.agent_settings_diff?.llm).toEqual({ model: 'openai/gpt-4o' });
    expect(response.llm_api_key_is_set).toBe(false);
  });
});
