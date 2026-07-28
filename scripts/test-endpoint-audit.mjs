import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_SCRIPT = path.join(REPO_ROOT, 'scripts/endpoint-audit.mjs');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'endpoint-audit-'));

try {
  fs.mkdirSync(path.join(fixtureRoot, 'src/client'), { recursive: true });

  fs.writeFileSync(
    path.join(fixtureRoot, 'openapi.json'),
    JSON.stringify({
      openapi: '3.1.0',
      paths: {
        '/api/supported': { get: {} },
        '/api/server-only': { get: {} },
      },
    })
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'src/client/agent-server-client.ts'),
    ["client.get('/api/supported');", "client.post('/api/client-only');", ''].join('\n')
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'src/client/cloud-client.ts'),
    [
      'cloud.get(`/api/v1/config/models/search${buildQuerySuffix(params)}`);',
      "cloud.get('/api/cloud-only');",
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'src/client/shared-client.ts'),
    ["shared.get('/api/shared-events/search');", ''].join('\n')
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'endpoint-audit.config.json'),
    JSON.stringify({
      specs: [{ name: 'agent-server', role: 'gate', file: 'openapi.json' }],
      clientGlobs: ['src/client'],
      excludeClientFiles: ['src/client/cloud-client.ts', 'src/client/shared-client.ts'],
      gate: { mismatch: false, missingApi: false },
    })
  );

  const result = spawnSync(process.execPath, [AUDIT_SCRIPT], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, '.audit/endpoint-audit.json'), 'utf8')
  );
  assert.deepEqual(report.clientOnly, ['POST /api/client-only']);
  assert.deepEqual(report.serverOnly, ['GET /api/server-only']);
  assert.deepEqual(report.excludedClientFiles, [
    'src/client/cloud-client.ts',
    'src/client/shared-client.ts',
  ]);
  assert.equal(report.client, 2);
  assert.equal(report.agentServer, 2);
  assert.deepEqual(report.gate, { clientOnly: false, serverOnly: false });
  assert(!result.stdout.includes('/api/cloud-only'));
  assert(!result.stdout.includes('/api/v1/config/models/search{}'));
  assert(!result.stdout.includes('/api/shared-events/search'));

  console.log('endpoint-audit tooling test passed');
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
