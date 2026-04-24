/**
 * Utility functions for integration tests
 */
/**
 * Wait for a condition to become true, with timeout
 */
export declare function waitFor(condition: () => boolean | Promise<boolean>, options?: {
    timeout?: number;
    interval?: number;
    message?: string;
}): Promise<void>;
/**
 * Sleep for a given number of milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Read a file from the host workspace directory
 */
export declare function readWorkspaceFile(relativePath: string): string;
/**
 * Write a file to the host workspace directory
 */
export declare function writeWorkspaceFile(relativePath: string, content: string): void;
/**
 * Check if a file exists in the host workspace directory
 */
export declare function workspaceFileExists(relativePath: string): boolean;
/**
 * Delete a file from the host workspace directory
 */
export declare function deleteWorkspaceFile(relativePath: string): void;
/**
 * Clean the workspace directory (remove all files)
 */
export declare function cleanWorkspace(): void;
/**
 * Create a unique test file name
 */
export declare function uniqueFileName(prefix?: string, extension?: string): string;
/**
 * Create a unique test directory name
 */
export declare function uniqueDirName(prefix?: string): string;
/**
 * Generate random text content
 */
export declare function randomContent(length?: number): string;
/**
 * Wait for the agent to complete (not running)
 */
export declare function waitForAgentIdle(checkStatus: () => Promise<string>, options?: {
    timeout?: number;
    interval?: number;
}): Promise<void>;
//# sourceMappingURL=test-utils.d.ts.map