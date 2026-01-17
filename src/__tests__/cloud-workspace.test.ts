import { CloudWorkspace } from '../workspace/cloud-workspace';
import { HttpClient } from '../client/http-client';

// Mock the HttpClient
jest.mock('../client/http-client');

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CloudWorkspace', () => {
  const mockCloudApiUrl = 'https://app.all-hands.dev';
  const mockCloudApiKey = 'test-cloud-api-key';
  const mockSandboxId = 'test-sandbox-id';
  const mockSessionApiKey = 'test-session-api-key';
  const mockAgentServerUrl = 'https://agent-server.example.com';

  let mockGet: jest.Mock;
  let mockPost: jest.Mock;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mocks for HttpClient methods
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockRequest = jest.fn();
    (HttpClient as jest.MockedClass<typeof HttpClient>).mockImplementation(() => ({
      get: mockGet,
      post: mockPost,
      put: jest.fn(),
      delete: jest.fn(),
      request: mockRequest,
      close: jest.fn(),
      baseUrl: mockAgentServerUrl,
      timeout: 60000,
    } as unknown as HttpClient));
  });

  describe('create', () => {
    it('should create a new sandbox and initialize workspace', async () => {
      // Mock sandbox creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: mockSandboxId,
            session_api_key: mockSessionApiKey,
          }),
        })
        // Mock sandbox status check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: mockSandboxId,
              status: 'RUNNING',
              session_api_key: mockSessionApiKey,
              exposed_urls: [{ name: 'AGENT_SERVER', url: mockAgentServerUrl }],
            },
          ],
        })
        // Mock health check
        .mockResolvedValueOnce({
          ok: true,
        });

      const workspace = await CloudWorkspace.create({
        cloudApiUrl: mockCloudApiUrl,
        cloudApiKey: mockCloudApiKey,
      });

      expect(workspace.sandboxId).toBe(mockSandboxId);
      expect(workspace.host).toBe(mockAgentServerUrl);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      await workspace.cleanup();
    });

    it('should resume an existing sandbox', async () => {
      // Mock sandbox resume
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        // Mock sandbox status check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: mockSandboxId,
              status: 'RUNNING',
              session_api_key: mockSessionApiKey,
              exposed_urls: [{ name: 'AGENT_SERVER', url: mockAgentServerUrl }],
            },
          ],
        })
        // Mock health check
        .mockResolvedValueOnce({
          ok: true,
        });

      const workspace = await CloudWorkspace.create({
        cloudApiUrl: mockCloudApiUrl,
        cloudApiKey: mockCloudApiKey,
        sandboxId: mockSandboxId,
      });

      expect(workspace.sandboxId).toBe(mockSandboxId);

      await workspace.cleanup();
    });

    it('should wait for sandbox to become ready', async () => {
      // Mock sandbox creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: mockSandboxId,
            session_api_key: mockSessionApiKey,
          }),
        })
        // First status check - STARTING
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: mockSandboxId,
              status: 'STARTING',
            },
          ],
        })
        // Second status check - RUNNING
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: mockSandboxId,
              status: 'RUNNING',
              session_api_key: mockSessionApiKey,
              exposed_urls: [{ name: 'AGENT_SERVER', url: mockAgentServerUrl }],
            },
          ],
        })
        // Mock health check
        .mockResolvedValueOnce({
          ok: true,
        });

      const workspace = await CloudWorkspace.create({
        cloudApiUrl: mockCloudApiUrl,
        cloudApiKey: mockCloudApiKey,
      });

      expect(workspace.sandboxId).toBe(mockSandboxId);

      await workspace.cleanup();
    });
  });

  describe('agent server operations', () => {
    let workspace: CloudWorkspace;

    beforeEach(async () => {
      // Setup workspace with mocked initialization
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: mockSandboxId,
            session_api_key: mockSessionApiKey,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: mockSandboxId,
              status: 'RUNNING',
              session_api_key: mockSessionApiKey,
              exposed_urls: [{ name: 'AGENT_SERVER', url: mockAgentServerUrl }],
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      workspace = await CloudWorkspace.create({
        cloudApiUrl: mockCloudApiUrl,
        cloudApiKey: mockCloudApiKey,
      });
    });

    afterEach(async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await workspace.cleanup();
    });

    describe('fileDownload', () => {
      it('should download file successfully', async () => {
        const mockContent = '{"test": "data"}';
        mockGet.mockResolvedValueOnce({
          data: mockContent,
          status: 200,
          statusText: 'OK',
        });

        const result = await workspace.fileDownload('/workspace/test.json');

        expect(result.success).toBe(true);
        expect(result.content).toBe(mockContent);
        expect(result.source_path).toBe('/workspace/test.json');
      });

      it('should handle HTTP errors', async () => {
        mockGet.mockRejectedValueOnce(new Error('HTTP 404: Not Found'));

        const result = await workspace.fileDownload('/workspace/test.json');

        expect(result.success).toBe(false);
        expect(result.error).toContain('404');
      });
    });

    describe('fileUpload', () => {
      it('should upload file successfully', async () => {
        mockRequest.mockResolvedValueOnce({
          data: { success: true },
          status: 200,
          statusText: 'OK',
        });

        const result = await workspace.fileUpload('test content', '/workspace/test.txt', 'test.txt');

        expect(result.success).toBe(true);
        expect(result.destination_path).toBe('/workspace/test.txt');
      });

      it('should handle HTTP errors', async () => {
        mockRequest.mockRejectedValueOnce(new Error('HTTP 500: Internal Server Error'));

        const result = await workspace.fileUpload('test content', '/workspace/test.txt', 'test.txt');

        expect(result.success).toBe(false);
        expect(result.error).toContain('500');
      });
    });

    describe('executeCommand', () => {
      it('should execute command successfully', async () => {
        // Mock start command
        mockPost.mockResolvedValueOnce({
          data: { id: 'cmd-123' },
          status: 200,
        });

        // Mock poll for output
        mockGet.mockResolvedValueOnce({
          data: {
            items: [
              {
                kind: 'BashOutput',
                stdout: 'hello world\n',
                exit_code: 0,
              },
            ],
          },
          status: 200,
        });

        const result = await workspace.executeCommand('echo "hello world"');

        expect(result.exit_code).toBe(0);
        expect(result.stdout).toBe('hello world\n');
      });
    });

    describe('gitChanges', () => {
      it('should get git changes successfully', async () => {
        const mockChanges = [
          { path: 'file1.txt', status: 'modified' },
          { path: 'file2.txt', status: 'added' },
        ];
        mockGet.mockResolvedValueOnce({
          data: mockChanges,
          status: 200,
          statusText: 'OK',
        });

        const changes = await workspace.gitChanges();

        expect(changes).toEqual(mockChanges);
      });
    });

    describe('gitDiff', () => {
      it('should get git diff successfully', async () => {
        const mockDiff = {
          path: 'file1.txt',
          diff: '--- a/file1.txt\n+++ b/file1.txt\n@@ -1 +1 @@\n-old\n+new',
        };
        mockGet.mockResolvedValueOnce({
          data: mockDiff,
          status: 200,
          statusText: 'OK',
        });

        const diff = await workspace.gitDiff('file1.txt');

        expect(diff).toEqual(mockDiff);
      });
    });

    describe('downloadAsText', () => {
      it('should return file content as string', async () => {
        const mockContent = 'test content';
        mockGet.mockResolvedValueOnce({
          data: mockContent,
          status: 200,
          statusText: 'OK',
        });

        const content = await workspace.downloadAsText('/workspace/test.txt');

        expect(content).toBe(mockContent);
      });

      it('should throw on failure', async () => {
        mockGet.mockRejectedValueOnce(new Error('HTTP 500: Internal Server Error'));

        await expect(workspace.downloadAsText('/workspace/test.txt')).rejects.toThrow();
      });
    });
  });

  describe('cleanup', () => {
    it('should delete sandbox on cleanup', async () => {
      // Setup workspace
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: mockSandboxId,
            session_api_key: mockSessionApiKey,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: mockSandboxId,
              status: 'RUNNING',
              session_api_key: mockSessionApiKey,
              exposed_urls: [{ name: 'AGENT_SERVER', url: mockAgentServerUrl }],
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const workspace = await CloudWorkspace.create({
        cloudApiUrl: mockCloudApiUrl,
        cloudApiKey: mockCloudApiKey,
      });

      // Mock delete
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await workspace.cleanup();

      // Verify delete was called
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/v1/sandboxes?sandbox_id='),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should keep sandbox alive if keepAlive is true', async () => {
      // Setup workspace with keepAlive
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: mockSandboxId,
            session_api_key: mockSessionApiKey,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: mockSandboxId,
              status: 'RUNNING',
              session_api_key: mockSessionApiKey,
              exposed_urls: [{ name: 'AGENT_SERVER', url: mockAgentServerUrl }],
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const workspace = await CloudWorkspace.create({
        cloudApiUrl: mockCloudApiUrl,
        cloudApiKey: mockCloudApiKey,
        keepAlive: true,
      });

      const fetchCallCount = mockFetch.mock.calls.length;

      await workspace.cleanup();

      // Verify delete was NOT called
      expect(mockFetch.mock.calls.length).toBe(fetchCallCount);
    });
  });
});
