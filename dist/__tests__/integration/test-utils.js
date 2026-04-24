/**
 * Utility functions for integration tests
 */
import * as fs from 'fs';
import * as path from 'path';
import { getServerTestConfig } from './test-config';
/**
 * Wait for a condition to become true, with timeout
 */
export async function waitFor(condition, options = {}) {
    const { timeout = 30000, interval = 100, message = 'Condition not met' } = options;
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await condition()) {
            return;
        }
        await sleep(interval);
    }
    throw new Error(`Timeout waiting: ${message}`);
}
/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Read a file from the host workspace directory
 */
export function readWorkspaceFile(relativePath) {
    const config = getServerTestConfig();
    const fullPath = path.join(config.hostWorkspaceDir, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
}
/**
 * Write a file to the host workspace directory
 */
export function writeWorkspaceFile(relativePath, content) {
    const config = getServerTestConfig();
    const fullPath = path.join(config.hostWorkspaceDir, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf-8');
}
/**
 * Check if a file exists in the host workspace directory
 */
export function workspaceFileExists(relativePath) {
    const config = getServerTestConfig();
    const fullPath = path.join(config.hostWorkspaceDir, relativePath);
    return fs.existsSync(fullPath);
}
/**
 * Delete a file from the host workspace directory
 */
export function deleteWorkspaceFile(relativePath) {
    const config = getServerTestConfig();
    const fullPath = path.join(config.hostWorkspaceDir, relativePath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
}
/**
 * Clean the workspace directory (remove all files)
 */
export function cleanWorkspace() {
    const config = getServerTestConfig();
    if (fs.existsSync(config.hostWorkspaceDir)) {
        const files = fs.readdirSync(config.hostWorkspaceDir);
        for (const file of files) {
            const fullPath = path.join(config.hostWorkspaceDir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true });
            }
            else {
                fs.unlinkSync(fullPath);
            }
        }
    }
}
/**
 * Create a unique test file name
 */
export function uniqueFileName(prefix = 'test', extension = 'txt') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
}
/**
 * Create a unique test directory name
 */
export function uniqueDirName(prefix = 'test-dir') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
/**
 * Generate random text content
 */
export function randomContent(length = 100) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
/**
 * Wait for the agent to complete (not running)
 */
export async function waitForAgentIdle(checkStatus, options = {}) {
    const { timeout = 120000, interval = 500 } = options;
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const status = await checkStatus();
        if (status === 'idle' || status === 'finished' || status === 'error' || status === 'stuck') {
            return;
        }
        await sleep(interval);
    }
    throw new Error('Timeout waiting for agent to become idle');
}
//# sourceMappingURL=test-utils.js.map