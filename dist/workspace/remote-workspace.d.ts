/**
 * Remote workspace implementation for executing commands and file operations
 *
 * This implements the IWorkspace interface by connecting to a remote OpenHands
 * agent server. It mirrors the Python SDK's RemoteWorkspace class.
 */
import { BashClient } from '../client/bash-client';
import { HttpClient } from '../client/http-client';
import { CommandResult, FileOperationResult, FileDownloadResult, GitChange, GitDiff } from '../models/workspace';
import { IWorkspace, BaseWorkspaceOptions } from './base';
/**
 * Options for creating a RemoteWorkspace instance.
 */
export interface RemoteWorkspaceOptions extends BaseWorkspaceOptions {
    /** The remote host URL for the workspace (e.g., 'http://localhost:8000') */
    host: string;
    /** API key for authenticating with the remote host (optional) */
    apiKey?: string;
}
/**
 * Remote workspace implementation that connects to an OpenHands agent server.
 *
 * RemoteWorkspace provides access to a sandboxed environment running on a remote
 * OpenHands agent server. This is the recommended approach for production deployments
 * as it provides better isolation and security.
 */
export declare class RemoteWorkspace implements IWorkspace {
    readonly host: string;
    readonly workingDir: string;
    readonly apiKey?: string;
    readonly client: HttpClient;
    readonly bash: BashClient;
    constructor(options: RemoteWorkspaceOptions);
    executeCommand(command: string, cwd?: string, timeout?: number): Promise<CommandResult>;
    fileUpload(content: string | Blob | File, destinationPath: string, fileName?: string): Promise<FileOperationResult>;
    fileDownload(sourcePath: string): Promise<FileDownloadResult>;
    gitChanges(path: string): Promise<GitChange[]>;
    gitDiff(path: string): Promise<GitDiff>;
    /**
     * Convenience method to upload text content as a file
     */
    uploadText(text: string, destinationPath: string, fileName?: string): Promise<FileOperationResult>;
    /**
     * Convenience method to upload a File object (from file input)
     */
    uploadFileObject(file: File, destinationPath: string): Promise<FileOperationResult>;
    /**
     * Convenience method to download file content as text
     */
    downloadAsText(sourcePath: string): Promise<string>;
    /**
     * Convenience method to download file content as a Blob
     */
    downloadAsBlob(sourcePath: string): Promise<Blob>;
    /**
     * Convenience method to trigger a browser download of a file
     */
    downloadAndSave(sourcePath: string, saveAsFileName?: string): Promise<void>;
    close(): void;
}
//# sourceMappingURL=remote-workspace.d.ts.map