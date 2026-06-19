#!/usr/bin/env node
/**
 * Endpoint audit — reconciles the client's HTTP surface against the
 * agent-server OpenAPI spec and reports API drift:
 *
 *   1. mismatch    — client calls an endpoint the server does NOT expose
 *                    (a breakage, unless it lives on a known external backend
 *                    listed in `externalPrefixes`)
 *   2. missing API — server exposes an endpoint the client does NOT implement
 *
 * Ground truth is the server's own OpenAPI spec, fetched live from a running
 * container (preferred) or read from the committed fallback file.
 *
 * Exit code is non-zero on gating violations (see config.gate), so the script
 * can act as a release gate.
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
// 1. Ground truth: union of all configured backend specs
// ---------------------------------------------------------------------------
async function loadSpec(spec) {
  if (spec.url) {
    try {
      const res = await fetch(spec.url, { signal: AbortSignal.timeout(5000) });
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

const server = new Set(); // normalized "VERB /path"
for (const spec of cfg.specs) {
  const doc = await loadSpec(spec);
  for (const [p, methods] of Object.entries(doc.paths ?? {}))
    for (const verb of Object.keys(methods)) if (VERBS.includes(verb)) server.add(norm(verb, p));
}

// ---------------------------------------------------------------------------
// 2. Client surface: static extraction of every endpoint the client can call
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

const client = new Set();
for (const glob of cfg.clientGlobs) {
  for (const file of walk(path.join(ROOT, glob))) {
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
const isExternal = (k) => cfg.externalPrefixes.some((pre) => k.includes(pre));
const ignoredApi = (k) => (cfg.ignoreServerOnly ?? []).some((pre) => k.includes(pre));

const clientOnly = sorted([...client].filter((k) => !server.has(k)));
const mismatch = clientOnly.filter((k) => !isExternal(k) && !cfg.allowClientOnly.includes(k));
const external = clientOnly.filter(isExternal);
const missingApi = sorted([...server].filter((k) => !client.has(k) && !ignoredApi(k)));

// ---------------------------------------------------------------------------
// 4. Report
// ---------------------------------------------------------------------------
const section = (title, items) => {
  console.log(`\n${title} (${items.length})`);
  for (const k of items) console.log(`  ${k}`);
};
console.log(`\n=== Endpoint audit — server=${server.size} client=${client.size} ===`);
section('❌ MISMATCH — client calls an endpoint not on the server', mismatch);
section('ℹ️  external backend (not gated)', external);
section('➕ MISSING API — server has it, client does not implement', missingApi);

fs.mkdirSync(path.join(ROOT, '.audit'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, '.audit/endpoint-audit.json'),
  JSON.stringify(
    { server: server.size, client: client.size, mismatch, external, missingApi },
    null,
    2
  )
);

// ---------------------------------------------------------------------------
// 5. Gate
// ---------------------------------------------------------------------------
const g = cfg.gate ?? {};
const violations = [];
if (g.mismatch !== false && mismatch.length) violations.push(`${mismatch.length} mismatch`);
if (g.missingApi && missingApi.length) violations.push(`${missingApi.length} missing API`);

if (violations.length) {
  console.error(`\n❌ endpoint audit failed: ${violations.join(', ')}`);
  process.exit(1);
}
console.log('\n✅ endpoint audit passed');
