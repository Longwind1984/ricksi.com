# Codex Automation Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Codex usage, activity, frontier processing, and nightly production publication continue automatically after the Claude Code migration.

**Architecture:** Add a pure Codex rollout parser and merge its daily series beside the preserved Claude history. Move structured LLM execution behind an ephemeral Codex runner, make sync outcomes explicit, and run scheduled publication from a dedicated clean `main` worktree.

**Tech Stack:** Node.js 22 ESM, built-in `node:test`, Astro 5, JSONL, macOS launchd, Git worktrees.

## Global Constraints

- Preserve every unrelated user modification in the existing dirty checkout.
- Do not add runtime or test dependencies; use Node built-ins.
- Codex `cached_input_tokens` and `reasoning_output_tokens` are diagnostic subsets and must not be added to `total_tokens`.
- Preserve all committed Claude Code history and every existing non-Claude harness series.
- Freeze the claude.ai web estimate after `2026-07-21`.
- Frontier automation must use `codex exec --ephemeral --sandbox read-only` and must not create metered session logs.
- Production updates must originate from local `main`; feature branches must never be pushed as production.
- Do not alter knowledge publication rules, book allowlists, frontier ratings, or current visual work outside the usage source label/color.

---

### Task 1: Parse Codex rollout logs without double counting

**Files:**
- Create: `scripts/lib/codex-logs.mjs`
- Create: `test/codex-logs.test.mjs`

**Interfaces:**
- Produces: `scanCodexLogs(sessionsDir: string): Promise<{days, files, parsedLines}>`
- Produces: `scanCodexFiles(files: string[]): Promise<{days, files, parsedLines}>` for deterministic tests.
- Daily entries match Claude scan shape: `{msgs, sessions, tokens, in, out, cr, rz, models}`.

- [ ] **Step 1: Write failing parser tests**

Create fixtures at runtime with `mkdtempSync` and assert these exact behaviors:

```js
test('uses cumulative deltas and treats cache as an input subset', async () => {
  writeRollout('a.jsonl', [
    turn('gpt-5.6-terra'),
    token('2026-07-21T01:00:00Z', { input_tokens: 100, cached_input_tokens: 60, output_tokens: 20, reasoning_output_tokens: 5, total_tokens: 120 }),
    token('2026-07-21T01:01:00Z', { input_tokens: 150, cached_input_tokens: 90, output_tokens: 30, reasoning_output_tokens: 7, total_tokens: 180 }),
    token('2026-07-21T01:02:00Z', { input_tokens: 150, cached_input_tokens: 90, output_tokens: 30, reasoning_output_tokens: 7, total_tokens: 180 }),
  ]);
  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].tokens, 180);
  assert.equal(result.days['2026-07-21'].cr, 90);
  assert.equal(result.days['2026-07-21'].models['gpt-5.6-terra'].total, 180);
});

test('counts shared session ids as separate rollout files', async () => {
  writeRollout('parent.jsonl', [meta('same-id'), turn('gpt-5.6-sol'), token(ts1, usage(80))]);
  writeRollout('child.jsonl', [meta('same-id'), turn('gpt-5.6-sol'), token(ts2, usage(40))]);
  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].tokens, 120);
});

test('counts visible messages but ignores tool events', async () => {
  writeRollout('activity.jsonl', [user(ts), agent(ts), tool(ts), agent(ts)]);
  const result = await scanCodexLogs(root);
  assert.equal(result.days['2026-07-21'].msgs, 3);
  assert.equal(result.days['2026-07-21'].sessions, 1);
});
```

Also test cross-day allocation, a cumulative counter reset, malformed JSON, and the older schema where only `total_tokens` is populated.

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test test/codex-logs.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/codex-logs.mjs`.

- [ ] **Step 3: Implement the streaming parser**

Implement JSONL streaming with these helpers:

```js
const FIELDS = ['total_tokens', 'input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens'];

function delta(current, previous, field) {
  const now = Number(current?.[field]) || 0;
  const before = Number(previous?.[field]) || 0;
  return now >= before ? now - before : now;
}
```

For each file, update the active model on `turn_context`, add token deltas on `event_msg/token_count`, and count only `user_message` and `agent_message` events for activity. Use `dayKey(new Date(timestamp))`; skip invalid dates and malformed lines.

- [ ] **Step 4: Verify GREEN**

Run: `node --test test/codex-logs.test.mjs`

Expected: all parser tests pass with zero failures.

- [ ] **Step 5: Commit the parser**

```bash
git add scripts/lib/codex-logs.mjs test/codex-logs.test.mjs
git commit -m "feat(data): parse Codex usage and activity logs"
```

### Task 2: Upgrade Token aggregation to v5

**Files:**
- Create: `scripts/lib/usage-policy.mjs`
- Create: `test/usage-policy.test.mjs`
- Modify: `scripts/config.mjs`
- Modify: `scripts/collect-usage.mjs`
- Modify: `scripts/lib/claude-logs.mjs`
- Modify: `src/components/WorkbenchBoard.astro`
- Modify: `src/styles/glass.css`
- Modify: `docs/token-estimation.md`

**Interfaces:**
- Consumes: `scanCodexLogs(CONFIG.codexSessions)` from Task 1.
- Produces: `foldSourceSeries(previous, fresh)` and `estimateWebUsage(phases, asOf)` from `usage-policy.mjs`.
- Produces: `data/usage.json.sources.codex`, `cumulative_codex`, and `method.version = 5`.

- [ ] **Step 1: Write failing policy tests**

```js
test('web estimate stops at the migration cutoff', () => {
  const phases = [{ from: '2026-01-01', to: '2026-07-21', convsPerDay: 1, tokensPerConv: 100 }];
  assert.deepEqual(estimateWebUsage(phases, new Date('2026-07-21T12:00:00Z')), estimateWebUsage(phases, new Date('2026-08-21T12:00:00Z')));
});

test('fresh source days replace visible days and preserve archived days', () => {
  const prior = { '2026-07-20': { total: 10 }, '2026-07-21': { total: 20 } };
  const fresh = { '2026-07-21': { tokens: 30, out: 3, cr: 12, models: { 'gpt-5.6': { total: 30 } } } };
  assert.equal(foldSourceSeries(prior, fresh)['2026-07-20'].total, 10);
  assert.equal(foldSourceSeries(prior, fresh)['2026-07-21'].total, 30);
});

test('OpenAI Codex model names map to the Codex family', () => {
  assert.equal(modelFamily('gpt-5.6-sol'), 'Codex');
  assert.equal(modelFamily('codex-auto-review'), 'Codex');
});
```

- [ ] **Step 2: Run policy tests and confirm RED**

Run: `node --test test/usage-policy.test.mjs`

Expected: FAIL because `usage-policy.mjs` and Codex family mapping do not exist.

- [ ] **Step 3: Implement reusable policy helpers and configuration**

Add:

```js
agentUsage: {
  codexSessions: path.join(HOME, '.codex', 'sessions'),
  // existing paths remain unchanged
}
```

Export `foldSourceSeries` and `estimateWebUsage`. Fix the web phase to `to: '2026-07-21'`. Add the `Codex` family check before the fallback in `modelFamily`.

- [ ] **Step 4: Merge Codex into every usage aggregate**

In `collect-usage.mjs`:

```js
const codex = await scanCodexLogs(CONFIG.agentUsage.codexSessions);
const codexSeries = foldSourceSeries(prevSources.codex?.series, codex.days);
const agentSeriesList = [codexSeries, zcodeSeries, hermesSeries, kimiSeries, openclawSeries];
```

Add exact output fields and source metadata:

```js
cumulative_codex: fmtCompact(cumulativeCodex),
sources: {
  claude_code: existingClaudeSource,
  codex: { label: 'Codex', tokens: cumulativeCodex, compact: fmtCompact(cumulativeCodex), days: Object.keys(codexSeries).length, series: codexSeries },
  // existing sources
},
method: { version: 5, migration_date: '2026-07-21', /* existing archive fields */ }
```

Update comments and console diagnostics so `today`, `week`, `days7`, model share, output, cache share, and cumulative all include Codex once.

- [ ] **Step 5: Update the public explanation**

Render `Codex {u.cumulative_codex}` after Claude Code in `WorkbenchBoard.astro`, change the summary to `口径 v5`, add a `Codex` segment color, and rewrite `docs/token-estimation.md` to document cumulative deltas and cache subset semantics.

- [ ] **Step 6: Verify policy and live collection**

Run:

```bash
node --test test/usage-policy.test.mjs test/codex-logs.test.mjs
npm run collect:usage
jq '{today,cumulative,cumulative_codex,codex:.sources.codex,method:.method.version}' data/usage.json
```

Expected: tests pass; `cumulative_codex` is non-zero; source total is close to the sum of per-rollout cumulative maxima; method is 5; running again does not increase totals without new Codex events.

- [ ] **Step 7: Commit Token v5**

```bash
git add scripts/config.mjs scripts/collect-usage.mjs scripts/lib/usage-policy.mjs scripts/lib/claude-logs.mjs test/usage-policy.test.mjs src/components/WorkbenchBoard.astro src/styles/glass.css docs/token-estimation.md data/usage.json
git commit -m "feat(usage): add calibrated Codex Token source"
```

### Task 3: Add Codex to the activity heatmap

**Files:**
- Create: `test/activity-merge.test.mjs`
- Create: `scripts/lib/activity-policy.mjs`
- Modify: `scripts/collect-activity.mjs`
- Modify: `scripts/lib/sync-journal.mjs`

**Interfaces:**
- Consumes: `scanCodexLogs` from Task 1.
- Produces: `mergeAiActivity(claudeDays, codexDays)` returning daily summed message counts.
- Produces: `activity.sources.ai.{claude,codex}` diagnostics.

- [ ] **Step 1: Write the failing merge test**

```js
test('sums Claude and Codex collaboration messages by day', () => {
  const merged = mergeAiActivity({ '2026-07-21': { msgs: 4 } }, { '2026-07-21': { msgs: 7 }, '2026-07-22': { msgs: 2 } });
  assert.deepEqual(merged, { '2026-07-21': 11, '2026-07-22': 2 });
});
```

- [ ] **Step 2: Run the activity test and confirm RED**

Run: `node --test test/activity-merge.test.mjs`

Expected: FAIL because `activity-policy.mjs` does not exist.

- [ ] **Step 3: Implement and integrate the merge**

Use the union of Claude and Codex day keys, set `days[k].ai` from the merged map, and publish diagnostics:

```js
ai: {
  files: claude.files + codex.files,
  daysCovered: new Set([...Object.keys(claude.days), ...Object.keys(codex.days)]).size,
  claude: { files: claude.files, daysCovered: Object.keys(claude.days).length },
  codex: { files: codex.files, daysCovered: Object.keys(codex.days).length },
}
```

Update the journal line to show `AI 文件 Claude X / Codex Y` when split metadata exists.

- [ ] **Step 4: Verify activity collection**

Run:

```bash
node --test test/activity-merge.test.mjs test/codex-logs.test.mjs
npm run collect:activity
jq '{today:.days["2026-07-21"],ai:.sources.ai}' data/activity.json
```

Expected: tests pass and the current day AI count includes Codex messages.

- [ ] **Step 5: Commit activity integration**

```bash
git add scripts/collect-activity.mjs scripts/lib/activity-policy.mjs scripts/lib/sync-journal.mjs test/activity-merge.test.mjs data/activity.json
git commit -m "feat(activity): include Codex collaboration logs"
```

### Task 4: Replace Claude frontier processing with ephemeral Codex

**Files:**
- Create: `scripts/lib/codex-runner.mjs`
- Create: `test/codex-runner.test.mjs`
- Modify: `scripts/config.mjs`
- Modify: `scripts/collect-frontier.mjs`
- Modify: `docs/frontier-routine.md`
- Modify: `README.md`

**Interfaces:**
- Produces: `codexExecArgs({schemaFile, outputFile, model})`.
- Produces: `runCodexStructured({bin, model, schema, prompt, timeoutMs, spawnImpl})` returning parsed JSON.
- `collect-frontier.mjs` calls `runCodexStructured` through `enrichEntry` and keeps its existing entry schema.

- [ ] **Step 1: Write failing runner tests**

```js
test('builds an ephemeral read-only structured invocation', () => {
  const args = codexExecArgs({ schemaFile: '/tmp/schema.json', outputFile: '/tmp/out.json', model: 'gpt-5.6-terra' });
  assert.ok(args.includes('--ephemeral'));
  assert.deepEqual(args.slice(args.indexOf('--sandbox'), args.indexOf('--sandbox') + 2), ['--sandbox', 'read-only']);
  assert.ok(args.includes('--output-schema'));
  assert.ok(args.includes('--output-last-message'));
  assert.equal(args.at(-1), '-');
});

test('parses the final structured message written by Codex', () => {
  const spawnImpl = (_bin, args) => {
    const out = args[args.indexOf('--output-last-message') + 1];
    writeFileSync(out, JSON.stringify({ relevant: true, titleZh: '标题' }));
    return { status: 0, stdout: '', stderr: '' };
  };
  assert.equal(runCodexStructured({ bin: '/codex', model: 'gpt-5.6-terra', schema, prompt: 'x', timeoutMs: 1000, spawnImpl }).titleZh, '标题');
});
```

Also assert non-zero status classification for rate/quota errors and cleanup of the temporary directory.

- [ ] **Step 2: Run runner tests and confirm RED**

Run: `node --test test/codex-runner.test.mjs`

Expected: FAIL because the runner module does not exist.

- [ ] **Step 3: Implement the Codex runner**

Use `mkdtempSync(join(tmpdir(), 'rick-frontier-codex-'))`, write the schema, spawn with prompt in `input`, parse the output file, and remove only that exact temporary directory in `finally`.

- [ ] **Step 4: Replace the frontier call site**

Replace `runClaude` with `runCodexStructured`; update configuration to:

```js
codex: {
  bin: '/Applications/ChatGPT.app/Contents/Resources/codex',
  model: 'gpt-5.6-terra',
  timeoutMs: 120000,
  retries: 1,
}
```

Change console labels and error strings from `claude` to `codex`. Keep fetch, filters, queue semantics, rating schema, sanitization, and storage unchanged.

- [ ] **Step 5: Update operational documentation**

Document local ephemeral Codex processing in `README.md`. Mark the Claude cloud Routine as retired on 2026-07-21 and explain that it is not a Codex fallback.

- [ ] **Step 6: Verify runner and frontier fetch path**

Run:

```bash
node --test test/codex-runner.test.mjs
npm run collect:frontier -- --dry-run
```

Then run one schema smoke call through `runCodexStructured` with a minimal harmless prompt and confirm no new file appears under `~/.codex/sessions`.

- [ ] **Step 7: Commit frontier migration**

```bash
git add scripts/lib/codex-runner.mjs test/codex-runner.test.mjs scripts/config.mjs scripts/collect-frontier.mjs docs/frontier-routine.md README.md
git commit -m "feat(frontier): migrate structured processing to Codex"
```

### Task 5: Make sync branch-safe and observable

**Files:**
- Create: `scripts/lib/sync-runtime.mjs`
- Create: `test/sync-runtime.test.mjs`
- Modify: `scripts/sync.mjs`
- Modify: `scripts/lib/sync-journal.mjs`

**Interfaces:**
- Produces: `assertProductionBranch(branch, {noPush})`.
- Produces: `runRecoverable(name, fn, warnings)`.
- Produces: `acquireSyncLock(lockFile, pid)` returning a release function.
- `writeVaultJournal` accepts `warnings?: Array<{name, message}>`.

- [ ] **Step 1: Write failing runtime tests**

```js
test('rejects publication from a feature branch', () => {
  assert.throws(() => assertProductionBranch('feat/demo', { noPush: false }), /main/);
  assert.doesNotThrow(() => assertProductionBranch('feat/demo', { noPush: true }));
});

test('recoverable failures are collected without throwing', async () => {
  const warnings = [];
  await runRecoverable('微信读书', async () => { throw new Error('expired'); }, warnings);
  assert.deepEqual(warnings, [{ name: '微信读书', message: 'expired' }]);
});

test('an existing live lock prevents overlap', () => {
  const release = acquireSyncLock(lock, process.pid);
  assert.throws(() => acquireSyncLock(lock, process.pid), /正在运行/);
  release();
});
```

- [ ] **Step 2: Run runtime tests and confirm RED**

Run: `node --test test/sync-runtime.test.mjs`

Expected: FAIL because `sync-runtime.mjs` does not exist.

- [ ] **Step 3: Implement guards, lock, and recoverable outcomes**

Use exclusive file creation for the lock. Store `{pid, startedAt}`. Treat a lock as stale only if `process.kill(pid, 0)` reports `ESRCH`; never recursively delete paths. `assertProductionBranch` allows non-main only for `--no-push` diagnostics.

- [ ] **Step 4: Integrate into sync orchestration**

At startup acquire the lock and release it in `finally`. Before collectors, verify the branch and for publish runs execute `git pull --ff-only`. Wrap GitHub, WeRead, local ePub, and frontier in `runRecoverable`. Use:

```js
const statusLabel = warnings.length ? `⚠ partial: ${warnings.map((w) => w.name).join(', ')}` : `✓ pushed ${head}`;
logRun(statusLabel);
writeVaultJournal({ outcome: warnings.length ? '⚠ 部分成功' : '✓ 推送', head, fileCount, durSec: durSec(), warnings });
```

For partial success send a quiet notification; retain the existing fatal failure path and exit code.

- [ ] **Step 5: Verify runtime tests and non-push sync**

Run:

```bash
node --test test/sync-runtime.test.mjs
npm run sync -- --no-push
```

Expected: tests pass; no commit or push occurs; any recoverable source failure is reported as partial.

- [ ] **Step 6: Commit sync hardening**

```bash
git add scripts/lib/sync-runtime.mjs test/sync-runtime.test.mjs scripts/sync.mjs scripts/lib/sync-journal.mjs
git commit -m "fix(sync): isolate production publication and partial failures"
```

### Task 6: Install the dedicated production worktree and LaunchAgent

**Files:**
- Modify: `scripts/com.ricksi.workbench-sync.plist`
- Modify: `README.md`
- Runtime install: `/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync`
- Runtime install: `/Users/rick/Library/LaunchAgents/com.ricksi.workbench-sync.plist`

**Interfaces:**
- LaunchAgent executes `/opt/homebrew/bin/npm run sync` in the dedicated `main` worktree at 21:30 Asia/Shanghai local time.

- [ ] **Step 1: Update the tracked plist and installation instructions**

Set `WorkingDirectory` to `/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync`. Document that this directory is reserved for automation and daily development happens in the original checkout.

- [ ] **Step 2: Commit the tracked scheduler configuration**

```bash
git add scripts/com.ricksi.workbench-sync.plist README.md
git commit -m "fix(sync): schedule production from dedicated main worktree"
```

- [ ] **Step 3: Create or refresh the production worktree**

Verify no worktree already owns `main`, then run:

```bash
git worktree add "/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync" main
git -C "/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync" pull --ff-only origin main
npm install --prefix "/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync"
```

If the directory already exists, verify it is the same repository and clean before reuse; never overwrite an unrelated directory.

- [ ] **Step 4: Install and reload the LaunchAgent**

Copy the exact tracked plist to `~/Library/LaunchAgents`, boot out the existing label if present, bootstrap the new plist, and verify with:

```bash
launchctl print gui/501/com.ricksi.workbench-sync
plutil -p /Users/rick/Library/LaunchAgents/com.ricksi.workbench-sync.plist
```

Expected: working directory is `rick-homepage-sync`, schedule is 21:30, and the job is loaded.

### Task 7: Full regression and production handoff

**Files:**
- Modify generated artifacts only if collectors produce real new data: `data/usage.json`, `data/activity.json`, `data/frontier.json`, `data/frontier-seen.json`, `data/graph.json`, `data/kb-manifest.json`, `data/reading.json`, `content/kb/**`, `public/assets/books/**`.
- Modify: `WORKLOG.md`

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified local production automation installation and an auditable worklog entry.

- [ ] **Step 1: Run the complete test suite**

Run: `node --test test/*.test.mjs`

Expected: all tests pass, zero failures.

- [ ] **Step 2: Verify collectors and idempotence**

Run in the implementation worktree:

```bash
npm run collect:activity
npm run collect:usage
cp data/usage.json /tmp/rick-usage-first.json
npm run collect:usage
cmp /tmp/rick-usage-first.json data/usage.json
```

Because `generated_at` changes, compare semantic fields with `jq -S 'del(.generated_at)'` if byte comparison differs. Expected: Codex totals and all historic source totals remain identical across the two scans when no new event appears.

- [ ] **Step 3: Run privacy and production build verification**

Run:

```bash
npm run verify:privacy
npm run build
```

Expected: privacy invariants pass and Astro build exits 0.

- [ ] **Step 4: Run the dedicated worktree without publishing**

Run:

```bash
npm run sync --prefix "/Users/rick/Claude_Code/Rick's Personal/rick-homepage-sync" -- --no-push
```

Expected: every fatal step succeeds, no commit/push occurs, and any recoverable warning is explicitly labeled partial.

- [ ] **Step 5: Record the migration**

Append a dated WORKLOG entry with exact Token v5 totals, test counts, build result, production worktree path, LaunchAgent state, and any remaining source-coverage warnings.

- [ ] **Step 6: Commit verification artifacts**

```bash
git add WORKLOG.md data/usage.json data/activity.json
git commit -m "docs: record verified Codex automation migration"
```

- [ ] **Step 7: Inspect final scope**

Run:

```bash
git status --short
git diff --stat origin/main...HEAD
git log --oneline --decorate -10
```

Expected: only migration files and real generated data are included; none of the user's Liquid Glass or other dirty checkout changes appear.
