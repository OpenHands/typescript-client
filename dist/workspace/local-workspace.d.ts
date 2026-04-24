/**
 * Local workspace stub implementation.
 *
 * This is a stub implementation of the IWorkspace interface for local execution.
 * All methods throw descriptive errors directing users to RemoteWorkspace.
 *
 * This mirrors the Python SDK's LocalWorkspace class architecture.
 */
import { CommandResult, FileOperationResult, FileDownloadResult, GitChange, GitDiff } from '../models/workspace';
import { IWorkspace, BaseWorkspaceOptions } from './base';
/**
 * Options for creating a LocalWorkspace instance.
 */
export type LocalWorkspaceOptions = BaseWorkspaceOptions;
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
export declare class LocalWorkspace implements IWorkspace {
    readonly workingDir: string;
    constructor(options: LocalWorkspaceOptions);
    /**
     * Execute a bash command locally.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    executeCommand(_command: string, _cwd?: string, _timeout?: number): Promise<CommandResult>;
    /**
     * Write content to a file in the workspace.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    fileUpload(_content: string | Blob | File, _destinationPath: string, _fileName?: string): Promise<FileOperationResult>;
    /**
     * Read a file from the workspace.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    fileDownload(_sourcePath: string): Promise<FileDownloadResult>;
    /**
     * Get git changes for a repository.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    gitChanges(_repoPath: string): Promise<GitChange[]>;
    /**
     * Get git diff for a repository.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    gitDiff(_repoPath: string): Promise<GitDiff>;
    /**
     * Convenience method to write text content as a file.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    uploadText(_text: string, _destinationPath: string, _fileName?: string): Promise<FileOperationResult>;
    /**
     * Convenience method to upload a File object.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    uploadFileObject(_file: File, _destinationPath: string): Promise<FileOperationResult>;
    /**
     * Convenience method to download file content as text.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    downloadAsText(_sourcePath: string): Promise<string>;
    /**
     * Convenience method to download file content as a Blob.
     *
     * @throws LocalWorkspaceNotSupportedError - Always throws — not implemented
     */
    downloadAsBlob(_sourcePath: string): Promise<Blob>;
    /**
     * Close/cleanup the workspace.
     *
     * For the stub implementation, this is a no-op.
     */
    close(): void;
}
//# sourceMappingURL=local-workspace.d.ts.map