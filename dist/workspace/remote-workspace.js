/**
 * Remote workspace implementation for executing commands and file operations
 *
 * This implements the IWorkspace interface by connecting to a remote OpenHands
 * agent server. It mirrors the Python SDK's RemoteWorkspace class.
 */
import { BashClient } from '../client/bash-client';
import { HttpClient } from '../client/http-client';
/**
 * Remote workspace implementation that connects to an OpenHands agent server.
 *
 * RemoteWorkspace provides access to a sandboxed environment running on a remote
 * OpenHands agent server. This is the recommended approach for production deployments
 * as it provides better isolation and security.
 */
export class RemoteWorkspace {
    constructor(options) {
        this.host = options.host.replace(/\/$/, '');
        this.workingDir = options.workingDir;
        this.apiKey = options.apiKey;
        this.client = new HttpClient({
            baseUrl: this.host,
            apiKey: this.apiKey,
            timeout: 60000,
        });
        this.bash = new BashClient({
            host: this.host,
            ...(this.apiKey ? { apiKey: this.apiKey } : {}),
        });
    }
    async executeCommand(command, cwd, timeout = 30.0) {
        const payload = {
            command,
            timeout: Math.floor(timeout),
        };
        if (cwd) {
            payload.cwd = cwd;
        }
        const response = await this.client.post('/api/bash/execute_bash_command', payload, {
            timeout: (timeout + 10) * 1000,
        });
        const bashOutput = response.data;
        return {
            command,
            exit_code: bashOutput.exit_code ?? 0,
            stdout: bashOutput.stdout || '',
            stderr: bashOutput.stderr || '',
            timeout_occurred: false,
        };
    }
    async fileUpload(content, destinationPath, fileName) {
        const formData = new FormData();
        let blob;
        let finalFileName;
        if (content instanceof File) {
            blob = content;
            finalFileName = fileName || content.name;
        }
        else if (content instanceof Blob) {
            blob = content;
            finalFileName = fileName || 'blob-file';
        }
        else {
            blob = new Blob([content], { type: 'text/plain' });
            finalFileName = fileName || 'text-file.txt';
        }
        formData.append('file', blob, finalFileName);
        const response = await this.client.request({
            method: 'POST',
            url: '/api/file/upload',
            params: { path: destinationPath },
            data: formData,
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
    }
    async fileDownload(sourcePath) {
        const response = await this.client.get('/api/file/download', {
            params: { path: sourcePath },
            timeout: 60000,
        });
        let content;
        let fileSize;
        if (typeof response.data === 'string') {
            content = response.data;
            fileSize = new Blob([response.data]).size;
        }
        else if (response.data instanceof ArrayBuffer) {
            content = new Blob([response.data]);
            fileSize = response.data.byteLength;
        }
        else if (response.data instanceof Blob) {
            content = response.data;
            fileSize = response.data.size;
        }
        else {
            const stringData = JSON.stringify(response.data);
            content = stringData;
            fileSize = new Blob([stringData]).size;
        }
        return {
            success: true,
            source_path: sourcePath,
            content,
            file_size: fileSize,
        };
    }
    async gitChanges(path) {
        try {
            const response = await this.client.get('/api/git/changes', {
                params: { path },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get git changes: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
    }
    async gitDiff(path) {
        try {
            const response = await this.client.get('/api/git/diff', {
                params: { path },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
    }
    /**
     * Convenience method to upload text content as a file
     */
    async uploadText(text, destinationPath, fileName) {
        return this.fileUpload(text, destinationPath, fileName);
    }
    /**
     * Convenience method to upload a File object (from file input)
     */
    async uploadFileObject(file, destinationPath) {
        return this.fileUpload(file, destinationPath);
    }
    /**
     * Convenience method to download file content as text
     */
    async downloadAsText(sourcePath) {
        const result = await this.fileDownload(sourcePath);
        if (!result.success) {
            throw new Error(result.error || 'Download failed');
        }
        if (typeof result.content === 'string') {
            return result.content;
        }
        else if (result.content instanceof Blob) {
            return await result.content.text();
        }
        return '';
    }
    /**
     * Convenience method to download file content as a Blob
     */
    async downloadAsBlob(sourcePath) {
        const result = await this.fileDownload(sourcePath);
        if (!result.success) {
            throw new Error(result.error || 'Download failed');
        }
        if (result.content instanceof Blob) {
            return result.content;
        }
        else if (typeof result.content === 'string') {
            return new Blob([result.content], { type: 'text/plain' });
        }
        return new Blob();
    }
    /**
     * Convenience method to trigger a browser download of a file
     */
    async downloadAndSave(sourcePath, saveAsFileName) {
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
    close() {
        this.bash.close();
        this.client.close();
    }
}
//# sourceMappingURL=remote-workspace.js.map