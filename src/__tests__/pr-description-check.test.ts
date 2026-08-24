/**
 * Unit tests for .github/scripts/check-pr-description.mjs and the companion
 * refresh/post-comment scripts.
 *
 * The PR gate is exercised through its real CLI against a real local HTTP
 * server standing in for the GitHub API (via GITHUB_API_URL), so the tests
 * cover link extraction, the ready-for-dev label requirement, and the
 * pre-rollout grandfathering without mocking the script's own logic.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { AddressInfo } from 'node:net';

const REPO_ROOT = resolve(__dirname, '../..');
const PR_CHECK_SCRIPT = join(REPO_ROOT, '.github/scripts/check-pr-description.mjs');
const COMMENT_SCRIPT = join(REPO_ROOT, '.github/scripts/post-readiness-comment.mjs');
const REFRESH_SCRIPT = join(REPO_ROOT, '.github/scripts/refresh-linked-pr-checks.mjs');

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

// Async spawn, not spawnSync: the fake GitHub API server lives in this same
// process, so a synchronous spawn would block the event loop and deadlock
// against the child's fetch.
function runScript(
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv = {}
): Promise<RunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', rejectPromise);
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
}

describe('check-pr-description', () => {
  let dir: string;
  let server: Server;
  let apiRoot: string;
  // issue number -> labels + creation date served by the fake API
  let issues: Record<string, { labels: string[]; created_at: string }>;

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const match = /^\/repos\/[^/]+\/[^/]+\/issues\/(\d+)$/.exec(req.url ?? '');
      const issue = match ? issues[match[1]] : undefined;
      if (issue) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            labels: issue.labels.map((name) => ({ name })),
            created_at: issue.created_at,
          })
        );
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Not Found' }));
      }
    });
    await new Promise<void>((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
    apiRoot = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    // close() alone waits for idle keep-alive connections held by the
    // script's fetch client; destroy them so the close callback fires.
    server.closeIdleConnections();
    await new Promise<void>((resolvePromise, rejectPromise) =>
      server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
    );
  });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pr-description-'));
    issues = {};
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeBody(body: string): string {
    const file = join(dir, 'pr-body.md');
    writeFileSync(file, body);
    return file;
  }

  function runGate(body: string, withApi = false): Promise<RunResult> {
    const args = ['--body-file', writeBody(body)];
    const env: NodeJS.ProcessEnv = {};
    if (withApi) {
      args.push('--repo', 'OpenHands/typescript-client');
      env.GITHUB_API_URL = apiRoot;
      env.GITHUB_TOKEN = 'test-token';
    }
    return runScript(PR_CHECK_SCRIPT, args, env);
  }

  describe('link extraction (local mode, no token)', () => {
    it('passes when the body links an issue with a keyword', async () => {
      const result = await runGate('## Summary\n\nFixes #357\n');
      expect(result.status).toBe(0);
    });

    it('accepts a bare #123 reference inside the Issue Number section', async () => {
      const result = await runGate('## Summary\n\nStuff.\n\n## Issue Number\n\n#357\n');
      expect(result.status).toBe(0);
    });

    it('ignores a bare #123 reference outside the Issue Number section', async () => {
      const result = await runGate('## Summary\n\nSee #357 for context.\n');
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/Link an issue/);
    });

    it('fails when no issue is linked', async () => {
      const result = await runGate('## Summary\n\nNo links here.\n');
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/::error::/);
    });
  });

  describe('linked-issue readiness (API mode)', () => {
    it('passes when the linked issue carries ready-for-dev', async () => {
      issues['357'] = { labels: ['ready-for-dev'], created_at: '2026-08-24T01:00:00Z' };
      const result = await runGate('Fixes #357', true);
      expect(result.status).toBe(0);
    });

    it('blocks when a newly created linked issue lacks ready-for-dev', async () => {
      issues['357'] = { labels: ['enhancement'], created_at: '2026-08-26T01:00:00Z' };
      const result = await runGate('Fixes #357', true);
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/#357/);
      expect(result.stdout).toMatch(/ready-for-dev/);
    });

    it('grandfathers issues created before the readiness rollout', async () => {
      issues['357'] = { labels: ['enhancement'], created_at: '2026-08-24T01:00:00Z' };
      const result = await runGate('Fixes #357', true);
      expect(result.status).toBe(0);
    });

    it('fails when every referenced issue 404s', async () => {
      const result = await runGate('Fixes #99999', true);
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/could not be found/);
    });

    it('passes when at least checking proceeds past a 404 among ready issues', async () => {
      issues['357'] = { labels: ['ready-for-dev'], created_at: '2026-08-26T01:00:00Z' };
      const result = await runGate('Fixes #357 and closes #99999', true);
      expect(result.status).toBe(0);
    });
  });

  describe('event payload mode', () => {
    it('reads the PR body and repo from GITHUB_EVENT_PATH', async () => {
      issues['357'] = { labels: ['ready-for-dev'], created_at: '2026-08-26T01:00:00Z' };
      const eventPath = join(dir, 'event.json');
      writeFileSync(
        eventPath,
        JSON.stringify({
          pull_request: { body: 'Fixes #357' },
          repository: { full_name: 'OpenHands/typescript-client' },
        })
      );
      const result = await runScript(PR_CHECK_SCRIPT, ['--event-path', eventPath], {
        GITHUB_API_URL: apiRoot,
        GITHUB_TOKEN: 'test-token',
      });
      expect(result.status).toBe(0);
    });
  });
});

describe('post-readiness-comment', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'readiness-comment-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('prints a ready comment with the idempotency marker in --dry-run mode', async () => {
    const result = await runScript(COMMENT_SCRIPT, ['--dry-run', '--ready']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('<!-- issue-readiness-check -->');
    expect(result.stdout).toContain('`ready-for-dev` label applied');
  });

  it('prints not-ready reasons from a reasons file in --dry-run mode', async () => {
    const reasonsFile = join(dir, 'reasons.txt');
    writeFileSync(reasonsFile, 'Missing Acceptance Criteria\nMissing npm command\n');
    const result = await runScript(COMMENT_SCRIPT, ['--dry-run', '--reasons-file', reasonsFile]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('<!-- issue-readiness-check -->');
    expect(result.stdout).toContain('- Missing Acceptance Criteria');
    expect(result.stdout).toContain('- Missing npm command');
    expect(result.stdout).toContain('`npm`, `pnpm`, `yarn`, or `npx`');
  });
});

describe('refresh-linked-pr-checks', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'refresh-pr-checks-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeEvent(payload: unknown): string {
    const file = join(dir, 'event.json');
    writeFileSync(file, JSON.stringify(payload));
    return file;
  }

  it('no-ops for label events other than ready-for-dev', async () => {
    const eventPath = writeEvent({
      action: 'labeled',
      label: { name: 'bug' },
      issue: { number: 1 },
      repository: { full_name: 'OpenHands/typescript-client' },
    });
    const result = await runScript(REFRESH_SCRIPT, ['--event-path', eventPath]);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toMatch(/refreshing PR gates/);
  });

  it('no-ops for non-label actions', async () => {
    const eventPath = writeEvent({
      action: 'opened',
      issue: { number: 1 },
      repository: { full_name: 'OpenHands/typescript-client' },
    });
    const result = await runScript(REFRESH_SCRIPT, ['--event-path', eventPath]);
    expect(result.status).toBe(0);
  });

  it('no-ops when the event payload lacks repository or issue', async () => {
    const eventPath = writeEvent({ action: 'labeled', label: { name: 'ready-for-dev' } });
    const result = await runScript(REFRESH_SCRIPT, ['--event-path', eventPath]);
    expect(result.status).toBe(0);
  });

  it('exits 0 without an event payload', async () => {
    const envWithoutEventPath = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== 'GITHUB_EVENT_PATH')
    );
    const result = await new Promise<RunResult>((resolvePromise, rejectPromise) => {
      const child = spawn(process.execPath, [REFRESH_SCRIPT], { env: envWithoutEventPath });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('error', rejectPromise);
      child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/nothing to refresh/);
  });
});
