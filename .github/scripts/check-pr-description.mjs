#!/usr/bin/env node

/**
 * Validate that a PR links at least one issue and that every linked issue is
 * allowed to receive PRs: it must exist in this repository and either carry
 * the `ready-for-dev` label or predate the readiness-gate rollout (existing
 * issues were never evaluated by the issue-readiness workflow, so requiring
 * the label retroactively would block PRs against long-open issues).
 *
 * Linked issues are detected via GitHub auto-link keywords (`Fixes #123`,
 * `Closes #123`, `Resolves #123`, …) anywhere in the body, plus bare `#123`
 * references inside the `## Issue Number` template section.
 *
 * The API lookup runs when a repository and GITHUB_TOKEN are available (CI).
 * In local `--body-file` mode without a token, only the presence of a linked
 * issue is checked.
 *
 * Unlike the issue-readiness check, this script is a gate: it exits 1 when
 * validation fails so the PR check stays red until the linked issue is ready.
 *
 * Local usage:
 *
 *   node .github/scripts/check-pr-description.mjs --body-file /tmp/pr-body.md
 *   node .github/scripts/check-pr-description.mjs --event-path "$GITHUB_EVENT_PATH"
 */

import { readFileSync } from 'node:fs';

const HEADING_RE = /^##\s+(.+?)\s*$/gm;
const ISSUE_REF_RE = /\b(?:fix|clos|resolv)(?:e?(?:s|d)?|ing)?\s+#(\d+)/gi;
const BARE_ISSUE_REF_RE = /(?<!\w)#(\d+)/g;
const READY_FOR_DEV_LABEL = 'ready-for-dev';
// Issues created before the `ready-for-dev` rollout are grandfathered: the
// issue-readiness workflow only labels issues on `issues` events, so long-open
// issues were never evaluated. The cutoff is the UTC day AFTER the
// rollout/deployment day (2026-08-24), so every issue predating deployment —
// including ones opened earlier that same day, before the workflow existed —
// is exempt. Issues created on or after 2026-08-25 must carry the label.
const READY_FOR_DEV_ROLLOUT_ISO = '2026-08-25';

const API_ROOT = process.env.GITHUB_API_URL ?? 'https://api.github.com';

export function extractSections(body) {
  const matches = [...body.matchAll(HEADING_RE)];
  const sections = {};
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    sections[matches[index][1].trim()] = body.slice(start, end);
  }
  return sections;
}

export function extractLinkedIssueNumbers(body) {
  const numbers = [];
  const seen = new Set();
  for (const match of body.matchAll(ISSUE_REF_RE)) {
    const number = Number.parseInt(match[1], 10);
    if (!seen.has(number)) {
      numbers.push(number);
      seen.add(number);
    }
  }

  const issueSection = extractSections(body)['Issue Number'] ?? '';
  for (const match of issueSection.matchAll(BARE_ISSUE_REF_RE)) {
    const number = Number.parseInt(match[1], 10);
    if (!seen.has(number)) {
      numbers.push(number);
      seen.add(number);
    }
  }
  return numbers;
}

export async function fetchIssueDetails(repo, issueNumber, token) {
  const resp = await fetch(`${API_ROOT}/repos/${repo}/issues/${issueNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    throw new Error(`Failed to fetch issue #${issueNumber}: ${resp.status} ${await resp.text()}`);
  }
  const issue = await resp.json();
  const labels = (Array.isArray(issue.labels) ? issue.labels : [])
    .filter((label) => label && typeof label === 'object')
    .map((label) => label.name);
  return { labels, createdAt: typeof issue.created_at === 'string' ? issue.created_at : '' };
}

export async function validateLinkedIssueReady(body, repo, token) {
  const numbers = extractLinkedIssueNumbers(body);
  if (numbers.length === 0) {
    return [
      'Link an issue in the `## Issue Number` section (e.g. `Fixes #123`). ' +
        'Newly opened issues must carry the `ready-for-dev` label.',
    ];
  }
  if (!repo || !token) return [];

  const checked = [];
  const notReadyNew = [];
  for (const number of numbers) {
    const details = await fetchIssueDetails(repo, number, token);
    if (details === null) continue;
    checked.push(number);
    if (details.labels.some((label) => label.toLowerCase() === READY_FOR_DEV_LABEL)) {
      continue;
    }
    if (details.createdAt.slice(0, 10) < READY_FOR_DEV_ROLLOUT_ISO) {
      // Predates the rollout; grandfathered to avoid retroactive blocking.
      continue;
    }
    notReadyNew.push(number);
  }

  if (checked.length === 0) {
    const refs = numbers.map((number) => `#${number}`).join(', ');
    return [`Referenced issue(s) ${refs} could not be found in this repository.`];
  }
  if (notReadyNew.length > 0) {
    const refs = notReadyNew.map((number) => `#${number}`).join(', ');
    return [
      `Linked issue(s) (${refs}) carry neither \`ready-for-dev\` nor a ` +
        'pre-rollout creation date. Newly referenced issues must meet the ' +
        'readiness criteria before a PR can be opened.',
    ];
  }
  return [];
}

function bodyAndRepoFromEvent(eventPath) {
  const payload = JSON.parse(readFileSync(eventPath, 'utf8'));
  const pullRequest = payload.pull_request;
  if (!pullRequest || typeof pullRequest !== 'object') {
    throw new Error('GitHub event payload does not contain a pull_request object');
  }
  const body = typeof pullRequest.body === 'string' ? pullRequest.body : '';
  const repo = payload.repository?.full_name;
  return { body, repo: typeof repo === 'string' ? repo : null };
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

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);

  let body;
  let repo;
  if (args.body_file) {
    body = readFileSync(args.body_file, 'utf8');
    repo = args.repo ?? null;
  } else {
    const eventPath = args.event_path ?? env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      throw new Error('Pass --body-file or set GITHUB_EVENT_PATH.');
    }
    ({ body, repo } = bodyAndRepoFromEvent(eventPath));
  }

  const errors = await validateLinkedIssueReady(body, repo, env.GITHUB_TOKEN);

  for (const error of errors) {
    process.stdout.write(`::error::${error}\n`);
  }
  if (errors.length > 0) {
    process.stdout.write(`PR description validation failed with ${errors.length} error(s).\n`);
    return 1;
  }
  process.stdout.write('PR description validation passed.\n');
  return 0;
}

// Only run as a CLI when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(2);
    });
}
