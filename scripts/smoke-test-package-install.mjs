import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'openhands-typescript-client-pkg-'));

try {
  const packedFilename = execFileSync('npm', ['pack', '--pack-destination', tempDir, '--silent'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)
    .pop();

  if (!packedFilename) {
    throw new Error('npm pack did not report a tarball filename');
  }

  const dependencyUrl = pathToFileURL(path.join(tempDir, packedFilename)).href;

  await writeFile(
    path.join(tempDir, 'package.json'),
    JSON.stringify(
      {
        name: 'openhands-typescript-client-package-smoke',
        private: true,
        type: 'module',
        dependencies: {
          '@openhands/typescript-client': dependencyUrl,
        },
      },
      null,
      2
    )
  );

  execFileSync('npm', ['install', '--no-fund', '--no-audit'], {
    cwd: tempDir,
    stdio: 'inherit',
  });

  execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      [
        "import { ACP_PROVIDERS, RemoteWorkspace as RootRemoteWorkspace } from '@openhands/typescript-client';",
        "import { ServerClient } from '@openhands/typescript-client/clients';",
        "import { HttpClient } from '@openhands/typescript-client/client/http-client';",
        "import { RemoteEventsList } from '@openhands/typescript-client/events/remote-events-list';",
        "import { RemoteWorkspace } from '@openhands/typescript-client/workspace/remote-workspace';",
        '[',
        '  typeof RootRemoteWorkspace,',
        "  typeof ACP_PROVIDERS['codex'],",
        '  typeof ServerClient,',
        '  typeof HttpClient,',
        '  typeof RemoteEventsList,',
        '  typeof RemoteWorkspace,',
        '].forEach((type) => {',
        "  if (type === 'undefined') throw new Error('package export resolved to undefined');",
        '});',
        "console.log('package import smoke passed');",
      ].join('\n'),
    ],
    {
      cwd: tempDir,
      stdio: 'inherit',
    }
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
