/**
 * Unit tests for .github/scripts/check-issue-readiness.mjs
 *
 * The script is exercised through its real CLI (a node child process) so the
 * tests cover the same code path the Issue Readiness Check workflow runs,
 * including the --json exit-code contract that keeps not-ready results safe
 * under `set -euo pipefail`.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const SCRIPT = join(REPO_ROOT, '.github/scripts/check-issue-readiness.mjs');

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runScript(args: string[], env: NodeJS.ProcessEnv = {}): RunResult {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const READY_BUG_BODY = [
  '### Bug Description',
  'start() rejects with a 404.',
  '',
  '### Actual Behavior',
  'Running `npm test` fails with `Error: request failed with status 404`.',
  '',
  '### Acceptance Criteria',
  '- [ ] The error no longer occurs',
].join('\n');

const READY_ENHANCEMENT_BODY = [
  '### Problem or Use Case',
  'Need typed cost metrics.',
  '',
  '### Desired Behavior',
  'Expose conversation.getCostMetrics().',
  '',
  '### Acceptance Criteria',
  '- [ ] The method returns typed cost metrics',
].join('\n');

describe('check-issue-readiness', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'issue-readiness-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeBody(body: string): string {
    const file = join(dir, 'body.md');
    writeFileSync(file, body);
    return file;
  }

  describe('bug criteria', () => {
    it('is ready when actual behavior has a reproducible command and acceptance criteria', () => {
      const result = runScript([
        '--body-file',
        writeBody(READY_BUG_BODY),
        '--labels',
        'bug',
        '--json',
      ]);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ ready: true, reasons: [] });
    });

    it.each(['npm test', 'pnpm vitest run', 'yarn test', 'npx tsx repro.ts', 'bun test'])(
      'accepts `%s` as a reproducible command',
      (command) => {
        const body = READY_BUG_BODY.replace('npm test', command);
        const result = runScript(['--body-file', writeBody(body), '--labels', 'bug', '--json']);
        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout).ready).toBe(true);
      }
    );

    it('is not ready when actual behavior lacks a reproducible command', () => {
      const body = READY_BUG_BODY.replace('Running `npm test` fails', 'It fails');
      const result = runScript(['--body-file', writeBody(body), '--labels', 'bug', '--json']);
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ready).toBe(false);
      expect(parsed.reasons.join('\n')).toMatch(/reproducible JavaScript\/TypeScript/);
    });

    it('is not ready when acceptance criteria has no checklist item', () => {
      const body = READY_BUG_BODY.replace('- [ ] The error no longer occurs', 'The error is gone.');
      const result = runScript(['--body-file', writeBody(body), '--labels', 'bug', '--json']);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ready).toBe(false);
      expect(parsed.reasons.join('\n')).toMatch(/checklist item/);
    });

    it('treats `_No response_` form placeholders as empty', () => {
      const body = READY_BUG_BODY.replace(
        'Running `npm test` fails with `Error: request failed with status 404`.',
        '_No response_'
      );
      const result = runScript(['--body-file', writeBody(body), '--labels', 'bug', '--json']);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ready).toBe(false);
      expect(parsed.reasons.join('\n')).toMatch(/Actual Behavior/);
    });

    it('ignores section content inside HTML comments', () => {
      const body = READY_BUG_BODY.replace(
        'Running `npm test` fails with `Error: request failed with status 404`.',
        '<!-- mention npm here to sneak past the check -->'
      );
      const result = runScript(['--body-file', writeBody(body), '--labels', 'bug', '--json']);
      expect(JSON.parse(result.stdout).ready).toBe(false);
    });
  });

  describe('enhancement criteria', () => {
    it('is ready with desired behavior and checklist acceptance criteria', () => {
      const result = runScript([
        '--body-file',
        writeBody(READY_ENHANCEMENT_BODY),
        '--labels',
        'enhancement',
        '--json',
      ]);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ ready: true, reasons: [] });
    });

    it('is not ready without a desired behavior section', () => {
      const body = READY_ENHANCEMENT_BODY.replace('### Desired Behavior', '### Something Else');
      const result = runScript([
        '--body-file',
        writeBody(body),
        '--labels',
        'enhancement',
        '--json',
      ]);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ready).toBe(false);
      expect(parsed.reasons.join('\n')).toMatch(/Desired Behavior/);
    });
  });

  describe('label gating', () => {
    it('is not ready without a bug or enhancement label', () => {
      const result = runScript([
        '--body-file',
        writeBody(READY_BUG_BODY),
        '--labels',
        '',
        '--json',
      ]);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ready).toBe(false);
      expect(parsed.reasons.join('\n')).toMatch(/neither the `bug` nor `enhancement` label/);
    });

    it('matches labels case-insensitively', () => {
      const result = runScript([
        '--body-file',
        writeBody(READY_BUG_BODY),
        '--labels',
        'Bug',
        '--json',
      ]);
      expect(JSON.parse(result.stdout).ready).toBe(true);
    });
  });

  describe('CLI contract', () => {
    it('exits 0 in --json mode even when the issue is not ready (pipefail-safe)', () => {
      const result = runScript([
        '--body-file',
        writeBody('no sections here'),
        '--labels',
        'bug',
        '--json',
      ]);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).ready).toBe(false);
    });

    it('exits 1 in human-readable mode when the issue is not ready', () => {
      const result = runScript(['--body-file', writeBody('no sections here'), '--labels', 'bug']);
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/does not meet ready-for-dev criteria/);
    });

    it('exits 0 in human-readable mode when the issue is ready', () => {
      const result = runScript(['--body-file', writeBody(READY_BUG_BODY), '--labels', 'bug']);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/meets ready-for-dev criteria/);
    });

    it('reads body and labels from a GitHub event payload', () => {
      const eventPath = join(dir, 'event.json');
      writeFileSync(
        eventPath,
        JSON.stringify({
          issue: { body: READY_BUG_BODY, labels: [{ name: 'bug' }] },
        })
      );
      const result = runScript(['--event-path', eventPath, '--json']);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).ready).toBe(true);
    });

    it('falls back to GITHUB_EVENT_PATH when --event-path is not passed', () => {
      const eventPath = join(dir, 'event.json');
      writeFileSync(
        eventPath,
        JSON.stringify({
          issue: { body: 'empty', labels: [] },
        })
      );
      const envWithoutEventPath = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== 'GITHUB_EVENT_PATH')
      );
      const result = spawnSync(process.execPath, [SCRIPT, '--json'], {
        encoding: 'utf8',
        env: { ...envWithoutEventPath, GITHUB_EVENT_PATH: eventPath },
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).ready).toBe(false);
    });
  });
});
