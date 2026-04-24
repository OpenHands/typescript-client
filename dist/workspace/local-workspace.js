/**
 * Local workspace stub implementation.
 *
 * This is a stub implementation of the IWorkspace interface for local execution.
 * All methods throw descriptive errors directing users to RemoteWorkspace.
 *
 * This mirrors the Python SDK's LocalWorkspace class architecture.
 */
/**
 * Error thrown when LocalWorkspace methods are called.
 */
class LocalWorkspaceNotSupportedError extends Error {
    constructor(method) {
        super(`LocalWorkspace.${method}() is not implemented. ` + `Use RemoteWorkspace instead.`);
        this.name = 'LocalWorkspaceNotSupportedError';
    }
}
/**
 * Local workspace stub.
 *
 * This is a placeholder implementation that throws descriptive errors when methods
 * are called. Use RemoteWorkspace for actual workspace functionality.
 *
 * ```typescript
 * const workspace = new RemoteWorkspace({
 *   host: 'http://localhost:8000',
 *   workingDir: '/workspace'
 * });
 * const result = await workspace.executeCommand('ls -la');
 * ```
 */
export class LocalWorkspace {
    constructor(options) {
        this.workingDir = options.workingDir;
    }
    /**
     * Execute a bash command locally.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async executeCommand(_command, _cwd, _timeout) {
        throw new LocalWorkspaceNotSupportedError('executeCommand');
    }
    /**
     * Write content to a file in the workspace.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async fileUpload(_content, _destinationPath, _fileName) {
        throw new LocalWorkspaceNotSupportedError('fileUpload');
    }
    /**
     * Read a file from the workspace.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async fileDownload(_sourcePath) {
        throw new LocalWorkspaceNotSupportedError('fileDownload');
    }
    /**
     * Get git changes for a repository.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async gitChanges(_repoPath) {
        throw new LocalWorkspaceNotSupportedError('gitChanges');
    }
    /**
     * Get git diff for a repository.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async gitDiff(_repoPath) {
        throw new LocalWorkspaceNotSupportedError('gitDiff');
    }
    /**
     * Convenience method to write text content as a file.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async uploadText(_text, _destinationPath, _fileName) {
        throw new LocalWorkspaceNotSupportedError('uploadText');
    }
    /**
     * Convenience method to upload a File object.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async uploadFileObject(_file, _destinationPath) {
        throw new LocalWorkspaceNotSupportedError('uploadFileObject');
    }
    /**
     * Convenience method to download file content as text.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async downloadAsText(_sourcePath) {
        throw new LocalWorkspaceNotSupportedError('downloadAsText');
    }
    /**
     * Convenience method to download file content as a Blob.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    async downloadAsBlob(_sourcePath) {
        throw new LocalWorkspaceNotSupportedError('downloadAsBlob');
    }
    /**
     * Close/cleanup the workspace.
     *
     * For the stub implementation, this is a no-op.
     */
    close() {
        // No-op for stub implementation
    }
}
//# sourceMappingURL=local-workspace.js.map