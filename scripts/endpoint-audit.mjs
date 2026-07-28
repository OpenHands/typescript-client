#!/usr/bin/env node
/**
 * Endpoint audit — reconciles handwritten Agent Server HTTP calls against the
 * pinned Agent Server OpenAPI spec in both directions:
 *
 *   - client-only: a handwritten Agent Server call is absent from the server;
 *   - server-only: the server exposes an operation with no handwritten call.
 *
 * Calls owned by another backend, such as CloudClient, are excluded explicitly
 * in endpoint-audit.config.json. Generated transport coverage is checked
 * separately by check:agent-server-api.
 *
 * Exit code is non-zero on gating violations (see config.gate).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'endpoint-audit.config.json'), 'utf8'));

const VERBS = ['get', 'post', 'put', 'patch', 'delete'];

// "/api/x/${id}" or "/api/x/{name}" -> "/api/x/{}", strip query + trailing slash
const norm = (verb, p) =>
  `${verb.toUpperCase()} ${
    p
      .split('?')[0]
      .replace(/\$?\{[^{}]*\}/g, '{}')
      .replace(/\/+$/, '') || '/'
  }`;

// ---------------------------------------------------------------------------
// 1. Agent Server contract
// ---------------------------------------------------------------------------
async function loadSpec(spec) {
  if (spec.url) {
    try {
      const res = await fetch(spec.url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return await res.json();
      console.warn(`  ! ${spec.name}: ${spec.url} -> HTTP ${res.status}, falling back to file`);
    } catch (e) {
      console.warn(
        `  ! ${spec.name}: ${spec.url} unreachable (${e.message}), falling back to file`
      );
    }
  }
  if (spec.file && fs.existsSync(path.join(ROOT, spec.file)))
    return JSON.parse(fs.readFileSync(path.join(ROOT, spec.file), 'utf8'));
  throw new Error(`spec "${spec.name}": no reachable url and no fallback file`);
}

const specToSet = (doc) => {
  const set = new Set(); // normalized "VERB /path"
  for (const [p, methods] of Object.entries(doc.paths ?? {}))
    for (const verb of Object.keys(methods)) if (VERBS.includes(verb)) set.add(norm(verb, p));
  return set;
};

const contract = new Set();
for (const spec of cfg.specs) {
  const doc = await loadSpec(spec);
  for (const endpoint of specToSet(doc)) contract.add(endpoint);
}

// ---------------------------------------------------------------------------
// 2. Handwritten Agent Server client surface
// ---------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      out.push(...walk(full));
    } else if (e.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const VERB_CALL = /\.(get|post|put|patch|delete)\s*(<[^>]*>)?\(/;
const PATH_LIT = /[`'"](\/(?:api|server_info|alive|health|ready)[^`'"]*)[`'"]/;
const excludedClientFiles = new Set(
  (cfg.excludeClientFiles ?? []).map((file) => path.normalize(file))
);

const client = new Set();
for (const glob of cfg.clientGlobs) {
  for (const file of walk(path.join(ROOT, glob))) {
    if (excludedClientFiles.has(path.normalize(path.relative(ROOT, file)))) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      // direct `.get/post/...(` calls, plus generic `.request({ method, url })`
      let verb = ln.match(VERB_CALL)?.[1];
      let win = 3;
      if (!verb && /\.request\s*\(/.test(ln)) {
        const block = lines.slice(i, i + 6).join('\n');
        verb = block.match(/method:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i)?.[1];
        win = 6;
      }
      if (!verb) return;
      const p = lines
        .slice(i, i + win)
        .join('\n')
        .match(PATH_LIT)?.[1];
      if (p) client.add(norm(verb, p));
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Diff
// ---------------------------------------------------------------------------
const sorted = (it) => [...it].sort();
const ignoredApi = (k) => (cfg.ignoreServerOnly ?? []).some((pre) => k.includes(pre));

const clientOnly = sorted([...client].filter((k) => !contract.has(k)));
const serverOnly = sorted([...contract].filter((k) => !client.has(k) && !ignoredApi(k)));

// ---------------------------------------------------------------------------
// 4. Report
// ---------------------------------------------------------------------------
const section = (title, items) => {
  console.log(`\n${title} (${items.length})`);
  for (const k of items) console.log(`  ${k}`);
};
console.log(
  `\n=== Endpoint audit — agent-server=${contract.size} audited-client=${client.size} ===`
);
section('⚠️ CLIENT-ONLY — handwritten call absent from agent-server', clientOnly);
section('⚠️ SERVER-ONLY — agent-server operation has no handwritten call', serverOnly);

fs.mkdirSync(path.join(ROOT, '.audit'), { recursive: true });
const gateConfig = cfg.gate ?? {};
fs.writeFileSync(
  path.join(ROOT, '.audit/endpoint-audit.json'),
  JSON.stringify(
    {
      agentServer: contract.size,
      client: client.size,
      excludedClientFiles: sorted(excludedClientFiles),
      clientOnly,
      serverOnly,
      // Backward-compatible field names for existing artifact consumers.
      mismatch: clientOnly,
      missingApi: serverOnly,
      gate: {
        clientOnly: gateConfig.mismatch !== false,
        serverOnly: Boolean(gateConfig.missingApi),
      },
    },
    null,
    2
  )
);

// ---------------------------------------------------------------------------
// 5. Gate
// ---------------------------------------------------------------------------
const violations = [];
if (gateConfig.mismatch !== false && clientOnly.length)
  violations.push(`${clientOnly.length} client-only`);
if (gateConfig.missingApi && serverOnly.length) violations.push(`${serverOnly.length} server-only`);

if (violations.length) {
  console.error(`\n❌ endpoint audit failed: ${violations.join(', ')}`);
  process.exit(1);
}
console.log('\n✅ endpoint audit passed');
