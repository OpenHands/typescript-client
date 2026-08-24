#!/usr/bin/env node

/**
 * Determine whether an issue meets the `ready-for-dev` readiness criteria.
 *
 * The criteria are type-specific:
 *
 * - Bug reports (labeled `bug`): the Actual Behavior section must describe a
 *   reproducible run of the TypeScript client and include a supported command
 *   (`npm`, `pnpm`, `yarn`, or `npx`), plus a non-empty Acceptance Criteria
 *   section with at least one checklist item.
 *
 * - Enhancements (labeled `enhancement`): the body must contain non-empty
 *   Desired Behavior and Acceptance Criteria sections, the latter with at
 *   least one checklist item.
 *
 * GitHub issue forms render each field as an `### <Label>` (h3) heading
 * followed by the field text, with empty optional fields rendered as
 * `_No response_`. This parser splits the body on those headings so each
 * criterion is checked against the right field rather than the whole body.
 *
 * In --json mode the process always exits 0: the JSON result on stdout drives
 * label and comment behavior, so a not-ready issue must not fail the workflow
 * step under `set -euo pipefail`.
 *
 * Local usage:
 *
 *   node .github/scripts/check-issue-readiness.mjs --body-file /tmp/issue.md --labels bug
 *   node .github/scripts/check-issue-readiness.mjs --event-path "$GITHUB_EVENT_PATH" --json
 */

import { readFileSync } from 'node:fs';

const BUG_LABEL = 'bug';
const ENHANCEMENT_LABEL = 'enhancement';

// Issue-form fields render as `### Label` h3 headings. `^###\s+` is specific
// enough because h1/h2 are not produced by issue forms.
const HEADING_RE = /^###\s+(.+?)\s*$/gm;

// `_No response_` is what GitHub writes for an empty optional form field.
const NO_RESPONSE = '_No response_';

// A reproducible JavaScript/TypeScript package-manager command must appear in
// the Actual Behavior section.
const RUN_METHOD_PATTERNS = [/\bnpm\b/i, /\bpnpm\b/i, /\byarn\b/i, /\bnpx\b/i, /\bbunx?\b/i];

// An Acceptance Criteria item is a markdown checklist bullet (`- [ ]` or
// `- [x]`). We require at least one so the section is verifiable.
const CHECKLIST_ITEM_RE = /^\s*[-*]\s*\[[ xX]\]/m;

export function visibleText(text) {
  const cleaned = text.replace(/<!--[\s\S]*?-->/g, '').trim();
  return cleaned === NO_RESPONSE ? '' : cleaned;
}

export function extractSections(body) {
  // Split the body into a {heading: text} map using `### <heading>`
  // boundaries. Free-form issues may still use `###` headings; if they don't,
  // the map is empty and every section lookup misses.
  const matches = [...body.matchAll(HEADING_RE)];
  const sections = {};
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    sections[matches[index][1].trim().toLowerCase()] = body.slice(start, end);
  }
  return sections;
}

function findSection(sections, ...labels) {
  for (const label of labels) {
    if (label in sections) return sections[label];
  }
  return '';
}

function referencesRunMethod(text) {
  return RUN_METHOD_PATTERNS.some((pattern) => pattern.test(text));
}

function hasChecklistItem(text) {
  return CHECKLIST_ITEM_RE.test(text);
}

function checkBug(sections) {
  const reasons = [];

  const actual = visibleText(findSection(sections, 'actual behavior', 'actual'));
  if (!actual) {
    reasons.push(
      'Fill in the `### Actual Behavior` section with reproducible steps and the observed result.'
    );
  } else if (!referencesRunMethod(actual)) {
    reasons.push(
      'The Actual Behavior section must include a reproducible JavaScript/TypeScript ' +
        'command such as `npm`, `pnpm`, `yarn`, or `npx`.'
    );
  }

  const acceptance = visibleText(findSection(sections, 'acceptance criteria', 'acceptance'));
  if (!acceptance) {
    reasons.push('Add an `### Acceptance Criteria` section with testable checklist items.');
  } else if (!hasChecklistItem(acceptance)) {
    reasons.push(
      'The Acceptance Criteria section must contain at least one checklist item (`- [ ] …`).'
    );
  }

  return { ready: reasons.length === 0, reasons };
}

function checkEnhancement(sections) {
  const reasons = [];

  const desired = visibleText(findSection(sections, 'desired behavior', 'desired'));
  if (!desired) {
    reasons.push('Add a `### Desired Behavior` section describing the behavior you want.');
  }

  const acceptance = visibleText(findSection(sections, 'acceptance criteria', 'acceptance'));
  if (!acceptance) {
    reasons.push('Add an `### Acceptance Criteria` section with testable checklist items.');
  } else if (!hasChecklistItem(acceptance)) {
    reasons.push(
      'The Acceptance Criteria section must contain at least one checklist item (`- [ ] …`).'
    );
  }

  return { ready: reasons.length === 0, reasons };
}

export function evaluateReadiness(body, labels) {
  // An issue is only a candidate when it carries the `bug` or `enhancement`
  // label. If it has neither, it is not-ready-for-dev: the gate does not apply
  // a label it cannot validate.
  const labelSet = new Set(labels.map((label) => label.toLowerCase()));
  const sections = extractSections(body ?? '');

  if (labelSet.has(BUG_LABEL)) return checkBug(sections);
  if (labelSet.has(ENHANCEMENT_LABEL)) return checkEnhancement(sections);

  return {
    ready: false,
    reasons: [
      'The issue has neither the `bug` nor `enhancement` label, so its readiness ' +
        'criteria cannot be evaluated. Add the appropriate label.',
    ],
  };
}

export function bodyAndLabelsFromEvent(eventPath) {
  const payload = JSON.parse(readFileSync(eventPath, 'utf8'));
  const issue = payload.issue ?? payload.pull_request;
  if (!issue || typeof issue !== 'object') {
    throw new Error('GitHub event payload does not contain an issue object');
  }
  const body = typeof issue.body === 'string' ? issue.body : '';
  const labels = (Array.isArray(issue.labels) ? issue.labels : [])
    .filter((label) => label && typeof label === 'object')
    .map((label) => label.name);
  return { body, labels };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eqIndex = arg.indexOf('=');
    const rawKey = (eqIndex === -1 ? arg.slice(2) : arg.slice(2, eqIndex)).replaceAll('-', '_');
    if (eqIndex !== -1) {
      args[rawKey] = arg.slice(eqIndex + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[rawKey] = argv[i + 1];
      i += 1;
    } else {
      args[rawKey] = '';
    }
  }
  return args;
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);

  let body;
  let labels;
  if (args.body_file) {
    body = readFileSync(args.body_file, 'utf8');
    labels = (args.labels ?? '')
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
  } else {
    const eventPath = args.event_path ?? env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      throw new Error('Pass --body-file or set GITHUB_EVENT_PATH.');
    }
    ({ body, labels } = bodyAndLabelsFromEvent(eventPath));
  }

  const result = evaluateReadiness(body, labels);

  if ('json' in args) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    // In --json mode the exit code is not meaningful: the result is consumed
    // via the printed JSON, and the workflow must run to completion for both
    // ready and not-ready issues (label add/remove, feedback comment).
    return 0;
  }

  if (result.ready) {
    process.stdout.write('Issue meets ready-for-dev criteria.\n');
  } else {
    process.stdout.write('Issue does not meet ready-for-dev criteria:\n');
    for (const reason of result.reasons) {
      process.stdout.write(`  - ${reason}\n`);
    }
  }
  return result.ready ? 0 : 1;
}

// Only run as a CLI when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }
}
