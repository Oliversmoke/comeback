#!/usr/bin/env node
/**
 * Bulk-create GitHub issues from ISSUES.md (StakeMind — Stellar Wave backlog).
 *
 * Usage:
 *   node scripts/bulk-issues.mjs            # dry-run (default): parse + report only
 *   node scripts/bulk-issues.mjs --create   # create labels (if missing) + issues on GitHub
 *
 * Requirements: gh CLI authenticated (GITHUB_TOKEN), repo set in git remote.
 *
 * Behavior:
 *   - Parses entries in the ISSUES.md format: `N. **[type] [P0-P3] Title** — Summary — AC`
 *   - Maps priority → Wave complexity label: P0→High/200, P1–P2→Medium/150, P3→Trivial/100
 *   - Maps type → GitHub type label: feat→enhancement, fix→bug, docs→documentation,
 *     test→test, chore→chore, security→security, perf→perf
 *   - Skips ISSUES.md entries already created on GitHub (ALREADY_CREATED set, verified below)
 *   - Creates issues with `gh issue create`, title style `type: title` (conventional),
 *     body with Summary + Acceptance Criteria + source reference
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CREATE = process.argv.includes('--create');
const REPO = 'Oliversmoke/comeback';
const ISSUES_MD = join(dirname(fileURLToPath(import.meta.url)), '..', 'ISSUES.md');

// ISSUES.md entries already created on GitHub (verified by title mapping):
// gh#2 → #51 (SDK XDR builders), gh#3 → #1 (deadline enforcement),
// gh#4 → #81/#82 (Freighter + SEP-10 auth), gh#5 → #191–#193 (indexer),
// gh#6 → #401 (de-branding)
const ALREADY_CREATED = new Set([1, 51, 81, 82, 191, 192, 193, 401]);

const COMPLEXITY_LABELS = ['High/200', 'Medium/150', 'Trivial/100'];
const TYPE_LABELS = ['test', 'chore', 'security', 'perf']; // enhancement/bug/documentation pre-exist
const PRIORITY_TO_COMPLEXITY = { P0: 'High/200', P1: 'Medium/150', P2: 'Medium/150', P3: 'Trivial/100' };
const TYPE_TO_LABEL = {
  feat: 'enhancement', fix: 'bug', docs: 'documentation',
  test: 'test', chore: 'chore', security: 'security', perf: 'perf',
};

function parseIssues() {
  const text = readFileSync(ISSUES_MD, 'utf8');
  const entries = [];
  const re = /^(\d+)\. \*\*\[(\w+)\] \[(P\d)\]\s*(.+?)\*\*\s*—\s*(.*)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const [, num, type, priority, title, rest] = m;
    const [summary = '', ...acParts] = rest.split(' — ');
    entries.push({
      num: Number(num),
      type: type.toLowerCase(),
      priority,
      title: title.trim(),
      summary: summary.trim(),
      ac: acParts.join(' — ').trim(),
    });
  }
  return entries;
}

function gh(args, opts = {}) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, ...opts });
}

function ensureLabels() {
  const existing = new Set(
    gh(['label', 'list', '--repo', REPO, '--json', 'name', '--jq', '.[].name', '--limit', '200'])
      .trim().split('\n').filter(Boolean).map((l) => l.trim())
  );
  for (const name of [...COMPLEXITY_LABELS, ...TYPE_LABELS]) {
    if (existing.has(name)) {
      console.log(`  label exists: ${name}`);
      continue;
    }
    try {
      gh(['label', 'create', name, '--repo', REPO, '--color', name.startsWith('High') ? 'd73a4a' : name.startsWith('Medium') ? 'fbca04' : '0e8a16']);
      console.log(`  created label: ${name}`);
    } catch (e) {
      console.error(`  FAILED label ${name}: ${e.stderr?.trim() || e.message}`);
    }
  }
}

function createIssue(entry, logPath) {
  const typeLabel = TYPE_TO_LABEL[entry.type] || 'enhancement';
  const complexity = PRIORITY_TO_COMPLEXITY[entry.priority] || 'Medium/150';
  const title = `${entry.type}: ${entry.title.replace(/^./, (c) => c.toLowerCase())}`;
  const body = [
    '## Summary',
    entry.summary,
    '',
    '## Acceptance Criteria',
    entry.ac,
    '',
    '---',
    `Source: ISSUES.md #${entry.num} · StakeMind`,
  ].join('\n');

  const url = gh([
    'issue', 'create', '--repo', REPO,
    '--title', title,
    '--body', body,
    '--label', typeLabel,
    '--label', complexity,
  ]).trim();
  const ghNum = url.match(/issues\/(\d+)$/)?.[1] || '?';
  const line = `${entry.num}\t${ghNum}\t${typeLabel}\t${complexity}\t${title}`;
  appendFileSync(logPath, line + '\n');
  return line;
}

const entries = parseIssues();
if (entries.length !== 401) {
  console.warn(`WARN: expected 401 entries from ISSUES.md, parsed ${entries.length} — review the regex/format.`);
}

// Idempotency guard: treat ISSUES.md numbers already logged as created (prevents
// accidental duplicates on re-run). The log lives in gitignored scripts/.bulk-issues.log.
const logPath = join(dirname(ISSUES_MD), 'scripts', '.bulk-issues.log');
const logged = new Set(
  existsSync(logPath)
    ? readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((l) => Number(l.split('\t')[0]))
    : []
);
const toCreate = entries.filter((e) => !ALREADY_CREATED.has(e.num) && !logged.has(e.num));
if (logged.size) console.log(`Additionally skipping ${logged.size} already logged in .bulk-issues.log`);
const skipped = entries.filter((e) => ALREADY_CREATED.has(e.num));

console.log(`Parsed ${entries.length} entries from ISSUES.md`);
console.log(`Skipping ${skipped.length} already on GitHub: ${skipped.map((e) => e.num).join(', ')}`);
console.log(`Will create: ${toCreate.length} issues`);

// Sanity checks
const missingSkips = [...ALREADY_CREATED].filter((n) => !entries.some((e) => e.num === n));
if (missingSkips.length) console.warn(`WARN: skip numbers not found in ISSUES.md: ${missingSkips.join(', ')}`);
const unmapped = [...new Set(toCreate.map((e) => e.type))].filter((t) => !TYPE_TO_LABEL[t]);
if (unmapped.length) console.warn(`WARN: unmapped types: ${unmapped.join(', ')}`);

if (!CREATE) {
  console.log('\n--- DRY RUN: first 5 ---');
  for (const e of toCreate.slice(0, 5)) {
    console.log(`#${e.num} [${e.type}] [${e.priority}] ${e.title}`);
    console.log(`    → labels: ${TYPE_TO_LABEL[e.type] || 'enhancement'} + ${PRIORITY_TO_COMPLEXITY[e.priority]}`);
  }
  console.log('Run with --create to actually create issues.');
  process.exit(0);
}

console.log('\nEnsuring labels exist...');
ensureLabels();

const created = [];
let failed = 0;
for (const e of toCreate) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const line = createIssue(e, logPath);
      created.push(line);
      if (created.length % 25 === 0) console.log(`  ${created.length}/${toCreate.length} created...`);
      break;
    } catch (err) {
      if (attempt === 3) {
        failed++;
        console.error(`  FAILED #${e.num} after 3 attempts: ${err.stderr?.trim() || err.message}`);
      } else {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
}

console.log(`\nDone. Created ${created.length}, failed ${failed}. Log: scripts/.bulk-issues.log`);
if (failed) process.exitCode = 1;
