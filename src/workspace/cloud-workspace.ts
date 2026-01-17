/**
 * OpenHands Cloud workspace implementation using Cloud API for sandbox management
 * and agent-server API for file/command operations.
 *
 * This workspace connects to OpenHands Cloud (app.all-hands.dev) to provision
 * and manage sandboxed environments for agent execution.
 *
 * Architecture:
 * - Cloud API (/api/v1/sandboxes): Used for sandbox lifecycle management
 * - Agent Server API: Used for file operations, command execution, git operations
 *   (same endpoints as RemoteWorkspace)
 *
 * The Cloud API creates a sandbox and returns an agent server URL in `exposed_urls`.
 * All file/command operations then go through the agent server.
 */

import { HttpClient } from '../client/http-client';
import {
  CommandResult,
  FileOperationResult,
  FileDownloadResult,
  GitChange,
  GitDiff,
} from '../models/workspace';

// Standard exposed URL names from OpenHands Cloud
const AGENT_SERVER = 'AGENT_SERVER';

export interface CloudWorkspaceOptions {
  /**
   * Base URL of OpenHands Cloud API (e.g., https://app.all-hands.dev)
   */
  cloudApiUrl: string;

  /**
   * API key for authenticating with OpenHands Cloud
   */
  cloudApiKey: string;

  /**
   * Working directory inside the sandbox (default: /workspace/project)
   */
  workingDir?: string;

  /**
   * Optional sandbox specification ID (e.g., container image)
   */
  sandboxSpecId?: string;

  /**
   * Optional sandbox ID to resume. If provided, the workspace will
   * attempt to resume the existing sandbox instead of creating a new one.
   */
  sandboxId?: string;

  /**
   * Sandbox initialization timeout in seconds (default: 300)
   */
  initTimeout?: number;

  /**
   * API request timeout in seconds (default: 60)
   */
  apiTimeout?: number;

  /**
   * If true, keep sandbox alive on cleanup instead of deleting (default: false)
   */
  keepAlive?: boolean;
}

interface SandboxInfo {
  id: string;
  status: string;
  session_api_key?: string;
  exposed_urls?: Array<{ name: string; url: string }>;
}

/**
 * CloudWorkspace provides sandbox management and workspace operations for OpenHands Cloud.
 *
 * This class manages the full sandbox lifecycle:
 * - Create new sandboxes via Cloud API
 * - Resume existing sandboxes
 * - Execute commands and file operations via agent server
 * - Clean up sandboxes on close
 *
 * Example:
 * ```typescript
 * // Create a new sandbox
 * const workspace = await CloudWorkspace.create({
 *   cloudApiUrl: 'https://app.all-hands.dev',
 *   cloudApiKey: 'your-api-key',
 * });
 *
 * // Execute a command
 * const result = await workspace.executeCommand('ls -la');
 * console.log(result.stdout);
 *
 * // Download a file
 * const content = await workspace.downloadAsText('/workspace/results.json');
 *
 * // Upload a file
 * await workspace.fileUpload('console.log("hello")', '/workspace/test.js', 'test.js');
 *
 * // Clean up
 * await workspace.cleanup();
 * ```
 */
export class CloudWorkspace {
  public readonly cloudApiUrl: string;
  public readonly cloudApiKey: string;
  public readonly workingDir: string;
  public readonly sandboxSpecId?: string;
  public readonly initTimeout: number;
  public readonly apiTimeout: number;
  public readonly keepAlive: boolean;

  // Agent server connection (set after sandbox is ready)
  private _host?: string;
  private _apiKey?: string;
  private _client?: HttpClient;

  // Sandbox state
  private _sandboxId?: string;
  private _exposedUrls?: Array<{ name: string; url: string }>;

  private constructor(options: CloudWorkspaceOptions) {
    this.cloudApiUrl = options.cloudApiUrl.replace(/\/$/, '');
    this.cloudApiKey = options.cloudApiKey;
    this.workingDir = options.workingDir || '/workspace/project';
    this.sandboxSpecId = options.sandboxSpecId;
    this.initTimeout = options.initTimeout || 300;
    this.apiTimeout = options.apiTimeout || 60;
    this.keepAlive = options.keepAlive || false;

    // If resuming an existing sandbox
    if (options.sandboxId) {
      this._sandboxId = options.sandboxId;
    }
  }

  /**
   * Create a new CloudWorkspace and initialize the sandbox.
   *
   * This is the recommended way to create a CloudWorkspace as it handles
   * the async initialization of the sandbox.
   */
  static async create(options: CloudWorkspaceOptions): Promise<CloudWorkspace> {
    const workspace = new CloudWorkspace(options);
    await workspace._initialize();
    return workspace;
  }

  /**
   * Resume an existing sandbox by ID.
   *
   * This is a convenience method that creates a CloudWorkspace with the
   * sandboxId option set.
   */
  static async resume(
    options: Omit<CloudWorkspaceOptions, 'sandboxId'> & { sandboxId: string }
  ): Promise<CloudWorkspace> {
    const workspace = new CloudWorkspace(options);
    await workspace._initialize();
    return workspace;
  }

  /**
   * Get the agent server host URL.
   */
  get host(): string {
    if (!this._host) {
      throw new Error('Workspace not initialized - call create() first');
    }
    return this._host;
  }

  /**
   * Get the HTTP client for agent server operations.
   */
  get client(): HttpClient {
    if (!this._client) {
      throw new Error('Workspace not initialized - call create() first');
    }
    return this._client;
  }

  /**
   * Get the sandbox ID.
   */
  get sandboxId(): string | undefined {
    return this._sandboxId;
  }

  /**
   * Check if the remote workspace is alive by querying the health endpoint.
   *
   * @returns True if the health endpoint returns a successful response, false otherwise.
   */
  get alive(): boolean {
    // Note: This is a synchronous getter that returns the last known state.
    // For async health check, use checkHealth() method.
    return this._host !== undefined && this._client !== undefined;
  }

  /**
   * Check if the agent server is healthy (async version).
   *
   * @returns Promise that resolves to true if healthy, false otherwise.
   */
  async checkHealth(): Promise<boolean> {
    if (!this._host) {
      return false;
    }

    try {
      const healthUrl = `${this._host}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Headers for Cloud API requests (Bearer token).
   */
  private get cloudApiHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.cloudApiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Headers for agent server requests (X-Session-API-Key).
   */
  private get agentServerHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this._apiKey) {
      headers['X-Session-API-Key'] = this._apiKey;
    }
    return headers;
  }

  /**
   * Initialize the workspace by starting or resuming a sandbox.
   */
  private async _initialize(): Promise<void> {
    try {
      if (this._sandboxId) {
        // Resume existing sandbox
        await this._resumeSandbox();
      } else {
        // Create new sandbox
        await this._createSandbox();
      }

      // Wait for sandbox to be ready
      await this._waitUntilReady();

      // Extract agent server URL
      const agentServerUrl = this._getAgentServerUrl();
      if (!agentServerUrl) {
        throw new Error(`Agent server URL not found in sandbox ${this._sandboxId}`);
      }

      console.log(`Sandbox ready at ${agentServerUrl}`);

      // Set up agent server connection
      this._host = agentServerUrl.replace(/\/$/, '');
      this._client = new HttpClient({
        baseUrl: this._host,
        apiKey: this._apiKey,
        timeout: this.apiTimeout * 1000,
      });
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Create a new sandbox via Cloud API.
   */
  private async _createSandbox(): Promise<void> {
    console.log('Starting sandbox via OpenHands Cloud API...');

    const params = new URLSearchParams();
    if (this.sandboxSpecId) {
      params.set('sandbox_spec_id', this.sandboxSpecId);
    }

    const url = `${this.cloudApiUrl}/api/v1/sandboxes${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.cloudApiHeaders,
      signal: AbortSignal.timeout(this.initTimeout * 1000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create sandbox: ${response.status} ${error}`);
    }

    const data = await response.json();
    this._sandboxId = data.id;
    this._apiKey = data.session_api_key;

    console.log(`Sandbox ${this._sandboxId} created, waiting for it to be ready...`);
  }

  /**
   * Resume an existing sandbox.
   */
  private async _resumeSandbox(): Promise<void> {
    console.log(`Resuming sandbox ${this._sandboxId}...`);

    const url = `${this.cloudApiUrl}/api/v1/sandboxes/${this._sandboxId}/resume`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.cloudApiHeaders,
      signal: AbortSignal.timeout(this.initTimeout * 1000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to resume sandbox: ${response.status} ${error}`);
    }
  }

  /**
   * Wait until the sandbox becomes RUNNING and responsive.
   */
  private async _waitUntilReady(): Promise<void> {
    const startTime = Date.now();
    const maxWaitMs = this.initTimeout * 1000;
    let delay = 2000; // Start with 2 second delay
    const maxDelay = 10000; // Max 10 second delay

    while (Date.now() - startTime < maxWaitMs) {
      console.debug('Checking sandbox status...');

      const sandbox = await this._getSandboxInfo();

      if (!sandbox) {
        throw new Error(`Sandbox ${this._sandboxId} not found`);
      }

      console.log(`Sandbox status: ${sandbox.status}`);

      if (sandbox.status === 'RUNNING') {
        // Update state from response
        this._apiKey = sandbox.session_api_key;
        this._exposedUrls = sandbox.exposed_urls || [];

        // Verify agent server is accessible
        const agentServerUrl = this._getAgentServerUrl();
        if (agentServerUrl) {
          await this._checkAgentServerHealth(agentServerUrl);
        }
        return;
      } else if (sandbox.status === 'STARTING') {
        // Wait and retry
        await this._sleep(delay);
        delay = Math.min(delay * 1.5, maxDelay); // Exponential backoff
      } else if (sandbox.status === 'ERROR' || sandbox.status === 'MISSING') {
        throw new Error(`Sandbox failed with status: ${sandbox.status}`);
      } else if (sandbox.status === 'PAUSED') {
        // Try to resume
        console.log('Sandbox is paused, attempting to resume...');
        await this._resumeSandbox();
        await this._sleep(delay);
      } else {
        console.warn(`Unknown sandbox status: ${sandbox.status}`);
        await this._sleep(delay);
      }
    }

    throw new Error(`Sandbox initialization timed out after ${this.initTimeout} seconds`);
  }

  /**
   * Get sandbox info from Cloud API.
   */
  private async _getSandboxInfo(): Promise<SandboxInfo | null> {
    const url = `${this.cloudApiUrl}/api/v1/sandboxes?id=${this._sandboxId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.cloudApiHeaders,
      signal: AbortSignal.timeout(this.apiTimeout * 1000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get sandbox info: ${response.status} ${error}`);
    }

    const sandboxes = await response.json();
    return sandboxes && sandboxes[0] ? sandboxes[0] : null;
  }

  /**
   * Check if the agent server is healthy.
   */
  private async _checkAgentServerHealth(agentServerUrl: string): Promise<void> {
    const healthUrl = `${agentServerUrl.replace(/\/$/, '')}/health`;
    console.debug(`Checking agent server health at: ${healthUrl}`);

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        console.debug('Agent server is healthy');
        return;
      }
      throw new Error(`Health check failed with status: ${response.status}`);
    } catch (error) {
      console.warn(`Health check failed: ${error}`);
      throw new Error(
        `Agent server health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract agent server URL from exposed_urls.
   */
  private _getAgentServerUrl(): string | undefined {
    if (!this._exposedUrls) {
      return undefined;
    }

    for (const urlInfo of this._exposedUrls) {
      if (urlInfo.name === AGENT_SERVER) {
        return urlInfo.url;
      }
    }

    return undefined;
  }

  /**
   * Sleep for the specified number of milliseconds.
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================
  // Agent Server Operations (same as RemoteWorkspace)
  // ============================================================

  /**
   * Execute a bash command on the remote system.
   */
  async executeCommand(
    command: string,
    cwd?: string,
    timeout: number = 30.0
  ): Promise<CommandResult> {
    console.debug(`Executing remote command: ${command}`);

    try {
      // Step 1: Start the bash command
      const payload: Record<string, unknown> = {
        command,
        timeout: Math.floor(timeout),
      };

      if (cwd) {
        payload.cwd = cwd;
      }

      const startResponse = await this.client.post('/api/bash/start_bash_command', payload, {
        headers: this.agentServerHeaders,
        timeout: (timeout + 5) * 1000,
      });

      const bashCommand = startResponse.data;
      const commandId = bashCommand.id;

      console.debug(`Started command with ID: ${commandId}`);

      // Step 2: Poll for output until command completes
      const startTime = Date.now();
      const stdoutParts: string[] = [];
      const stderrParts: string[] = [];
      let exitCode: number | null = null;

      while ((Date.now() - startTime) / 1000 < timeout) {
        const searchResponse = await this.client.get('/api/bash/bash_events/search', {
          params: {
            command_id__eq: commandId,
            sort_order: 'TIMESTAMP',
            limit: 100,
          },
          headers: this.agentServerHeaders,
          timeout: timeout * 1000,
        });

        const searchResult = searchResponse.data;

        for (const event of searchResult.items || []) {
          if (event.kind === 'BashOutput') {
            if (event.stdout) {
              stdoutParts.push(event.stdout);
            }
            if (event.stderr) {
              stderrParts.push(event.stderr);
            }
            if (event.exit_code !== undefined && event.exit_code !== null) {
              exitCode = event.exit_code;
            }
          }
        }

        if (exitCode !== null) {
          break;
        }

        await this._sleep(100);
      }

      if (exitCode === null) {
        console.warn(`Command timed out after ${timeout} seconds: ${command}`);
        exitCode = -1;
        stderrParts.push(`Command timed out after ${timeout} seconds`);
      }

      return {
        command,
        exit_code: exitCode,
        stdout: stdoutParts.join(''),
        stderr: stderrParts.join(''),
        timeout_occurred: exitCode === -1 && stderrParts.some((s) => s.includes('timed out')),
      };
    } catch (error) {
      console.error(`Remote command execution failed: ${error}`);
      return {
        command,
        exit_code: -1,
        stdout: '',
        stderr: `Remote execution error: ${error instanceof Error ? error.message : String(error)}`,
        timeout_occurred: false,
      };
    }
  }

  /**
   * Upload a file to the remote system.
   */
  async fileUpload(
    content: string | Blob | File,
    destinationPath: string,
    fileName?: string
  ): Promise<FileOperationResult> {
    console.debug(`Remote file upload to: ${destinationPath}`);

    try {
      const formData = new FormData();

      let blob: Blob;
      let finalFileName: string;

      // Check for File first (File extends Blob, so check File before Blob)
      // Note: File is not available in Node.js < 20, so we check if it's defined
      if (typeof File !== 'undefined' && content instanceof File) {
        blob = content;
        finalFileName = fileName || content.name;
      } else if (content instanceof Blob) {
        blob = content;
        finalFileName = fileName || 'blob-file';
      } else {
        blob = new Blob([content], { type: 'text/plain' });
        finalFileName = fileName || 'text-file.txt';
      }

      formData.append('file', blob, finalFileName);

      const response = await this.client.request({
        method: 'POST',
        url: `/api/file/upload/${destinationPath}`,
        data: formData,
        headers: this.agentServerHeaders,
        timeout: 60000,
      });

      const resultData = response.data;

      return {
        success: resultData.success ?? true,
        source_path: finalFileName,
        destination_path: destinationPath,
        file_size: resultData.file_size,
        error: resultData.error,
      };
    } catch (error) {
      console.error(`Remote file upload failed: ${error}`);
      return {
        success: false,
        source_path: fileName || 'unknown',
        destination_path: destinationPath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Download a file from the remote system.
   */
  async fileDownload(sourcePath: string): Promise<FileDownloadResult> {
    console.debug(`Remote file download: ${sourcePath}`);

    try {
      // Double slash ensures FastAPI extracts path with leading slash
      const url = `/api/file/download//${sourcePath.replace(/^\//, '')}`;

      const response = await this.client.get(url, {
        headers: this.agentServerHeaders,
        timeout: 60000,
      });

      let content: string | Blob;
      let fileSize: number;

      if (typeof response.data === 'string') {
        content = response.data;
        fileSize = new Blob([response.data]).size;
      } else if (response.data instanceof ArrayBuffer) {
        content = new Blob([response.data]);
        fileSize = response.data.byteLength;
      } else if (response.data instanceof Blob) {
        content = response.data;
        fileSize = response.data.size;
      } else {
        const stringData = JSON.stringify(response.data);
        content = stringData;
        fileSize = new Blob([stringData]).size;
      }

      return {
        success: true,
        source_path: sourcePath,
        content: content,
        file_size: fileSize,
      };
    } catch (error) {
      console.error(`Remote file download failed: ${error}`);
      return {
        success: false,
        source_path: sourcePath,
        content: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get git changes for the repository.
   */
  async gitChanges(path?: string): Promise<GitChange[]> {
    try {
      const gitPath = path ? `${this.workingDir}/${path}` : this.workingDir;
      const response = await this.client.get(`/api/git/changes/${gitPath}`, {
        headers: this.agentServerHeaders,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get git changes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get git diff for a file.
   */
  async gitDiff(path: string): Promise<GitDiff> {
    try {
      const gitPath = `${this.workingDir}/${path}`;
      const response = await this.client.get(`/api/git/diff/${gitPath}`, {
        headers: this.agentServerHeaders,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ============================================================
  // Convenience Methods
  // ============================================================

  /**
   * Upload text content as a file.
   */
  async uploadText(
    text: string,
    destinationPath: string,
    fileName?: string
  ): Promise<FileOperationResult> {
    return this.fileUpload(text, destinationPath, fileName);
  }

  /**
   * Upload a File object.
   */
  async uploadFileObject(file: File, destinationPath: string): Promise<FileOperationResult> {
    return this.fileUpload(file, destinationPath);
  }

  /**
   * Download file content as text.
   */
  async downloadAsText(sourcePath: string): Promise<string> {
    const result = await this.fileDownload(sourcePath);
    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }

    if (typeof result.content === 'string') {
      return result.content;
    } else if (result.content instanceof Blob) {
      return await result.content.text();
    }

    return '';
  }

  /**
   * Download file content as a Blob.
   */
  async downloadAsBlob(sourcePath: string): Promise<Blob> {
    const result = await this.fileDownload(sourcePath);
    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }

    if (result.content instanceof Blob) {
      return result.content;
    } else if (typeof result.content === 'string') {
      return new Blob([result.content], { type: 'text/plain' });
    }

    return new Blob();
  }

  /**
   * Trigger a browser download of a file.
   */
  async downloadAndSave(sourcePath: string, saveAsFileName?: string): Promise<void> {
    const blob = await this.downloadAsBlob(sourcePath);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = saveAsFileName || sourcePath.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // Lifecycle Management
  // ============================================================

  /**
   * Pause the sandbox to conserve resources.
   *
   * Note: OpenHands Cloud does not currently support pausing sandboxes.
   * This method throws an error until the API is available.
   *
   * @throws Error - Cloud API pause endpoint is not yet available.
   */
  pause(): void {
    throw new Error(
      'CloudWorkspace.pause() is not yet supported - Cloud API pause endpoint not available'
    );
  }

  /**
   * Resume a paused sandbox.
   */
  async resume(): Promise<void> {
    if (!this._sandboxId) {
      throw new Error('Cannot resume: sandbox is not running');
    }

    console.log(`Resuming sandbox ${this._sandboxId}`);
    await this._resumeSandbox();
    await this._waitUntilReady();
    console.log(`Sandbox resumed: ${this._sandboxId}`);
  }

  /**
   * Clean up the sandbox by deleting it.
   */
  async cleanup(): Promise<void> {
    if (!this._sandboxId) {
      return;
    }

    try {
      if (this.keepAlive) {
        console.log(`Keeping sandbox ${this._sandboxId} alive`);
        return;
      }

      console.log(`Deleting sandbox ${this._sandboxId}...`);

      const url = `${this.cloudApiUrl}/api/v1/sandboxes?sandbox_id=${this._sandboxId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.cloudApiHeaders,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn(`Failed to delete sandbox: ${response.status} ${error}`);
      } else {
        console.log(`Sandbox ${this._sandboxId} deleted`);
      }
    } catch (error) {
      console.warn(`Cleanup error: ${error}`);
    } finally {
      this._sandboxId = undefined;
      this._apiKey = undefined;
      this._exposedUrls = undefined;
      if (this._client) {
        this._client.close();
        this._client = undefined;
      }
    }
  }

  /**
   * Close the workspace (alias for cleanup).
   */
  close(): void {
    this.cleanup();
  }
}
