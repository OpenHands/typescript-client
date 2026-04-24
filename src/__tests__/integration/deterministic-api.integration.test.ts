import {
  Agent,
  ConversationManager,
  DesktopClient,
  HttpError,
  LLMMetadataClient,
  ServerClient,
  SettingsClient,
  SkillsClient,
  ToolClient,
  VSCodeClient,
  Workspace,
} from '../../index';
import { getServerTestConfig } from './test-config';
import {
  deleteWorkspaceFile,
  readWorkspaceFile,
  sleep,
  uniqueFileName,
  workspaceFileExists,
} from './test-utils';

const config = getServerTestConfig();

function createDummyAgent(): Agent {
  return new Agent({
    llm: {
      model: 'dummy/model',
      api_key: 'dummy-key',
    },
  });
}

async function expectSupportedOrLegacy404<T>(
  request: () => Promise<T>,
  assertSuccess: (value: T) => void
) {
  try {
    assertSuccess(await request());
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  }
}

describe('Deterministic API Integration Tests', () => {
  const manager = new ConversationManager({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const serverClient = new ServerClient({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const llmClient = new LLMMetadataClient({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const settingsClient = new SettingsClient({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const skillsClient = new SkillsClient({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const toolClient = new ToolClient({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const vscodeClient = new VSCodeClient({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const desktopClient = new DesktopClient({
    host: config.agentServerUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });
  const workspace = new Workspace({
    host: config.agentServerUrl,
    workingDir: config.agentWorkspaceDir,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
  });

  afterAll(() => {
    manager.close();
    serverClient.close();
    llmClient.close();
    settingsClient.close();
    skillsClient.close();
    toolClient.close();
    vscodeClient.close();
    desktopClient.close();
    workspace.close();
  });

  it(
    'reads server, metadata, settings, tools, and skills endpoints',
    async () => {
      const root = await serverClient.getRoot<Record<string, unknown>>();
      const alive = await serverClient.getAlive();
      const health = await serverClient.getHealth();
      const ready = await serverClient.getReady();
      const info = await serverClient.getServerInfo();

      expect(root).toBeDefined();
      expect(alive.status).toBe('ok');
      expect(health).toBe('OK');
      expect(['ready', 'initializing']).toContain(ready.status);
      expect(info.version).toBeDefined();

      await expectSupportedOrLegacy404(
        () => llmClient.getProviders(),
        (providers) => {
          expect(Array.isArray(providers)).toBe(true);
        }
      );
      await expectSupportedOrLegacy404(
        () => llmClient.getModels(),
        (models) => {
          expect(Array.isArray(models)).toBe(true);
        }
      );
      await expectSupportedOrLegacy404(
        () => llmClient.getVerifiedModels(),
        (verifiedModels) => {
          expect(typeof verifiedModels).toBe('object');
        }
      );
      await expectSupportedOrLegacy404(
        () => settingsClient.getAgentSchema(),
        (agentSchema) => {
          expect(agentSchema.model_name).toBeTruthy();
        }
      );
      await expectSupportedOrLegacy404(
        () => settingsClient.getConversationSchema(),
        (conversationSchema) => {
          expect(conversationSchema.model_name).toBeTruthy();
        }
      );
      await expectSupportedOrLegacy404(
        () => toolClient.listTools(),
        (tools) => {
          expect(Array.isArray(tools)).toBe(true);
        }
      );
      await expectSupportedOrLegacy404(
        () =>
          skillsClient.getSkills({
            load_public: false,
            load_user: false,
            load_project: false,
            load_org: false,
          }),
        (skills) => {
          expect(Array.isArray(skills.skills)).toBe(true);
        }
      );
      await expectSupportedOrLegacy404(
        () => vscodeClient.getStatus(),
        (vscodeStatus) => {
          expect(typeof vscodeStatus.enabled).toBe('boolean');
        }
      );

      try {
        const desktopUrl = await desktopClient.getUrl();
        expect(desktopUrl === null || typeof desktopUrl === 'string').toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect([404, 503]).toContain((error as HttpError).status);
      }
    },
    config.testTimeout
  );

  it(
    'supports deterministic conversation, event, fork, and ACP endpoints',
    async () => {
      const beforeCount = await manager.countConversations();
      const conversation = await manager.createConversation(createDummyAgent(), {
        workingDir: config.agentWorkspaceDir,
      });
      let forkedId: string | undefined;
      let acpConversationId: string | undefined;

      try {
        const afterCount = await manager.countConversations();
        expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

        const batch = await manager.getConversations([conversation.id]);
        expect(batch[0]?.id).toBe(conversation.id);

        await conversation.sendMessage('Deterministic integration message');
        const searchResult = await conversation.state.events.search({
          limit: 10,
          sort_order: 'TIMESTAMP_DESC',
        });
        expect(searchResult.items.length).toBeGreaterThan(0);

        const eventId = searchResult.items[0].id;
        const fetchedEvent = await conversation.state.events.getEventById(eventId);
        const fetchedBatch = await conversation.state.events.getEventsById([eventId]);
        expect(fetchedEvent.id).toBe(eventId);
        expect(fetchedBatch[0]?.id).toBe(eventId);

        try {
          const finalResponse = await conversation.getAgentFinalResponse();
          expect(typeof finalResponse).toBe('string');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpError);
          expect((error as HttpError).status).toBe(404);
        }

        const trajectoryFile = `/workspace/conversations/${conversation.id.replace(/-/g, '')}.zip`;
        await workspace.executeCommand(
          `mkdir -p /workspace/conversations && printf 'trajectory-data' > ${trajectoryFile}`
        );
        const trajectory = await conversation.downloadTrajectory();
        expect(trajectory).toBeInstanceOf(Blob);
        expect(await trajectory.text()).toContain('trajectory-data');
        await workspace.executeCommand(`rm -f ${trajectoryFile}`);

        try {
          const forkedConversation = await conversation.fork({
            title: 'Forked from deterministic test',
          });
          forkedId = forkedConversation.id;
          expect(forkedConversation.id).not.toBe(conversation.id);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpError);
          expect((error as HttpError).status).toBe(404);
        }

        await expect(
          conversation.switchProfile('__profile_that_should_not_exist__')
        ).rejects.toBeInstanceOf(HttpError);

        try {
          const acpConversation = await manager.createACPConversation(
            {
              kind: 'Agent',
              llm: { model: 'dummy/model', api_key: 'dummy-key' },
            },
            { workingDir: config.agentWorkspaceDir }
          );
          acpConversationId = acpConversation.id;

          const acpCount = await manager.countACPConversations();
          const fetchedACP = await manager.getACPConversation(acpConversation.id);
          const batchACP = await manager.getACPConversations([acpConversation.id]);
          expect(acpCount).toBeGreaterThan(0);
          expect(fetchedACP.id).toBe(acpConversation.id);
          expect(batchACP[0]?.id).toBe(acpConversation.id);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpError);
          expect((error as HttpError).status).toBe(404);
        }
      } finally {
        if (forkedId) {
          await manager.deleteConversation(forkedId).catch(() => undefined);
        }
        if (acpConversationId) {
          await manager.deleteConversation(acpConversationId).catch(() => undefined);
        }
        await manager.deleteConversation(conversation.id).catch(() => undefined);
      }
    },
    config.testTimeout
  );

  it(
    'uses preferred workspace file and git query endpoints',
    async () => {
      const fileName = uniqueFileName('deterministic-workspace');
      const fileContent = 'workspace content from deterministic test';
      const destinationPath = `${config.agentWorkspaceDir}/${fileName}`;
      const repoDir = `${config.agentWorkspaceDir}/git-query-test`;
      const trackedFile = `${repoDir}/tracked.txt`;

      try {
        const uploadResult = await workspace.uploadText(fileContent, destinationPath, fileName);
        expect(uploadResult.success).toBe(true);

        await sleep(300);
        expect(workspaceFileExists(fileName)).toBe(true);
        expect(readWorkspaceFile(fileName)).toBe(fileContent);

        const downloaded = await workspace.downloadAsText(destinationPath);
        expect(downloaded).toBe(fileContent);

        await workspace.executeCommand(
          [
            `rm -rf ${repoDir}`,
            `mkdir -p ${repoDir}`,
            `cd ${repoDir}`,
            'git init',
            'git config user.email tester@example.com',
            'git config user.name tester',
            'printf "line1\\n" > tracked.txt',
            'git add tracked.txt',
            'git commit -m initial',
            'printf "line2\\n" >> tracked.txt',
          ].join(' && ')
        );

        try {
          const changes = await workspace.gitChanges(repoDir);
          const diff = await workspace.gitDiff(trackedFile);

          expect(changes.some((change) => String(change.path).includes('tracked.txt'))).toBe(true);
          expect(diff.modified || diff.diff).toContain('line2');
        } catch (error) {
          expect(String(error)).toMatch(/Not a git repository|HTTP request failed \((404|500)/);
        }
      } finally {
        deleteWorkspaceFile(fileName);
        await workspace.executeCommand(`rm -rf ${repoDir}`);
      }
    },
    config.testTimeout
  );
});
