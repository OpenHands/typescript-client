#!/usr/bin/env node

/**
 * Re-run the PR Description Check workflow for every open PR that links an
 * issue whose `ready-for-dev` label just changed, so the linked-issue gate
 * does not go stale between PR events.
 *
 * Driven by an `issues` (labeled/unlabeled) event payload from
 * GITHUB_EVENT_PATH. Always exits 0: a refresh failure must not fail the
 * issue-readiness workflow — it only means a PR gate stays stale until the
 * next PR event.
 *
 * Usage:
 *   node .github/scripts/refresh-linked-pr-checks.mjs [--event-path "$GITHUB_EVENT_PATH"]
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { extractLinkedIssueNumbers } from './check-pr-description.mjs';

const PR_DESCRIPTION_CHECK_WORKFLOW = 'PR Description Check';

function gh(args) {
  // Returns { ok, stdout, stderr } without throwing so a gh failure degrades
  // to a warning instead of a workflow failure.
  try {
    const stdout = execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout, stderr: '' };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error.stdout === 'string' ? error.stdout : '',
      stderr: typeof error.stderr === 'string' ? error.stderr : String(error.message ?? error),
    };
  }
}

export function shouldRefresh(payload) {
  // Only a ready-for-dev label transition on an issue can change the outcome
  // of the linked-issue gate.
  if (!payload || typeof payload !== 'object') return false;
  if (payload.action !== 'labeled' && payload.action !== 'unlabeled') return false;
  return payload.label?.name === 'ready-for-dev';
}

function linkedOpenPrs(repo, issueNumber) {
  const [owner, name] = repo.split('/', 2);
  const query = `query($owner: String!, $name: String!, $num: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $num) {
      timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
        nodes {
          __typename
          ... on CrossReferencedEvent {
            source {
              __typename
              ... on PullRequest { number headRefOid state }
            }
          }
        }
      }
    }
  }
}`;
  const result = gh([
    'api',
    'graphql',
    '-f',
    `query=${query}`,
    '-F',
    `owner=${owner}`,
    '-F',
    `name=${name}`,
    '-F',
    `num=${issueNumber}`,
    '--jq',
    '.data.repository.issue.timelineItems.nodes',
  ]);
  if (!result.ok) {
    console.log(`::warning::Could not query linked PRs: ${result.stderr.trim()}`);
    return [];
  }
  let nodes;
  try {
    nodes = JSON.parse(result.stdout);
  } catch (error) {
    console.log(`::warning::Unexpected linked-PR query output: ${error.message}`);
    return [];
  }
  if (!Array.isArray(nodes)) return [];
  return nodes
    .map((node) => node?.source)
    .filter(
      (source) =>
        source &&
        typeof source === 'object' &&
        source.__typename === 'PullRequest' &&
        source.state === 'OPEN'
    );
}

function rerunPrDescriptionCheck(repo, headSha) {
  const runs = gh([
    'api',
    '-X',
    'GET',
    `repos/${repo}/actions/runs`,
    '-f',
    `head_sha=${headSha}`,
    '-f',
    'per_page=100',
    '--jq',
    `.workflow_runs[] | select(.name=="${PR_DESCRIPTION_CHECK_WORKFLOW}") | ` +
      'select(.event=="pull_request_target") | "\\(.id) \\(.created_at)"',
  ]);
  if (!runs.ok) {
    console.log(`::warning::Could not list PR checks: ${runs.stderr.trim()}`);
    return false;
  }
  const lines = runs.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/));
  if (lines.length === 0) return false;
  // Created-at is ISO 8601 and therefore sortable; pick the most recent run
  // for this commit.
  const latest = lines.sort((a, b) => a.slice(1).join(' ').localeCompare(b.slice(1).join(' ')))[
    lines.length - 1
  ][0];
  const rerun = gh(['api', '-X', 'POST', `repos/${repo}/actions/runs/${latest}/rerun`]);
  if (!rerun.ok) {
    console.log(
      `::warning::Could not re-run PR description check (${latest}): ${rerun.stderr.trim()}`
    );
    return false;
  }
  console.log(`Re-ran PR description check (run ${latest}) for linked open PR.`);
  return true;
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const eventPathIndex = argv.indexOf('--event-path');
  const eventPath =
    eventPathIndex !== -1 && argv[eventPathIndex + 1] ? argv[eventPathIndex + 1] : env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.log('No event payload available; nothing to refresh.');
    return 0;
  }

  const payload = JSON.parse(readFileSync(eventPath, 'utf8'));
  if (!shouldRefresh(payload)) return 0;

  const repo = payload.repository?.full_name;
  const issueNumber = payload.issue?.number;
  if (typeof repo !== 'string' || typeof issueNumber !== 'number') return 0;

  console.log(
    `ready-for-dev ${payload.action}: refreshing PR gates linked to issue #${issueNumber}.`
  );
  let refreshed = 0;
  for (const pr of linkedOpenPrs(repo, issueNumber)) {
    const body = gh(['pr', 'view', String(pr.number), '--repo', repo, '--json', 'body', '--jq', '.body']);
    if (!body.ok) continue;
    if (!extractLinkedIssueNumbers(body.stdout).includes(issueNumber)) {
      // Cross-referenced but not treated as a linked issue by the gate;
      // nothing to refresh.
      continue;
    }
    if (rerunPrDescriptionCheck(repo, pr.headRefOid)) refreshed += 1;
  }
  console.log(`Refreshed PR gates for ${refreshed} linked PR(s).`);
  return 0;
}

// Only run as a CLI when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
