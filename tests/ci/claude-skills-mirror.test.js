#!/usr/bin/env node
/**
 * Validate the .claude/skills mirror surface.
 *
 * Freebuff (and Claude Code project scope) auto-load skills from
 * `.claude/skills/`, while ECC's canonical curated surface is `skills/`.
 * scripts/sync-skills-to-claude.js keeps the mirror in sync. This test
 * guards that the mirror:
 *
 *   1. exists and covers every curated skills/<name>/SKILL.md 1:1
 *   2. contains byte-identical copies of each SKILL.md
 *   3. the sync script behaves correctly on a temp surface
 *      (create, update, prune stale, --check)
 *   4. the mirror npm script is registered in package.json
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const MIRROR_DIR = path.join(REPO_ROOT, '.claude', 'skills');
const SYNC_SCRIPT = path.join(REPO_ROOT, 'scripts', 'sync-skills-to-claude.js');

function listSkillDirs(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function runSync(env, args) {
  return spawnSync(process.execPath, [SYNC_SCRIPT, ...(args || [])], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// 1. Mirror covers every curated skill 1:1.
const curated = listSkillDirs(SKILLS_DIR).filter((name) =>
  fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md'))
);
assert.ok(curated.length > 0, 'expected curated skills/ to be non-empty');
assert.ok(
  fs.existsSync(MIRROR_DIR),
  '.claude/skills mirror is missing - run: node scripts/sync-skills-to-claude.js'
);

const mirrored = listSkillDirs(MIRROR_DIR);
const curatedSet = new Set(curated);
const mirroredSet = new Set(mirrored);

const missing = curated.filter((name) => !mirroredSet.has(name));
assert.deepStrictEqual(
  missing,
  [],
  `.claude/skills is missing ${missing.length} curated skills - run: node scripts/sync-skills-to-claude.js`
);

const orphaned = mirrored.filter((name) => !curatedSet.has(name));
assert.deepStrictEqual(
  orphaned,
  [],
  `.claude/skills contains ${orphaned.length} stale entries not in skills/`
);

// 2. Every mirrored SKILL.md is byte-identical to its source.
let drifted = 0;
for (const name of curated) {
  const source = fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
  const mirrorPath = path.join(MIRROR_DIR, name, 'SKILL.md');
  assert.ok(
    fs.existsSync(mirrorPath),
    `.claude/skills/${name}/SKILL.md is missing`
  );
  const mirror = fs.readFileSync(mirrorPath, 'utf8');
  if (mirror !== source) drifted += 1;
}
assert.strictEqual(
  drifted,
  0,
  `${drifted} mirrored SKILL.md files drifted from skills/ - run: node scripts/sync-skills-to-claude.js`
);

// 3. Hermetic sync-script behavior on a temp surface.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-mirror-'));
const tmpSource = path.join(tmp, 'skills');
const tmpTarget = path.join(tmp, '.claude', 'skills');
const env = { ECC_MIRROR_SOURCE: tmpSource, ECC_MIRROR_TARGET: tmpTarget };

try {
  fs.mkdirSync(path.join(tmpSource, 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(tmpSource, 'alpha', 'SKILL.md'), 'alpha v1\n');
  fs.mkdirSync(path.join(tmpSource, 'beta'), { recursive: true });
  fs.writeFileSync(path.join(tmpSource, 'beta', 'SKILL.md'), 'beta\n');
  // A directory without SKILL.md must never be mirrored.
  fs.mkdirSync(path.join(tmpSource, 'extras'), { recursive: true });
  fs.writeFileSync(path.join(tmpSource, 'extras', 'README.md'), 'not a skill\n');

  // First sync: creates mirror, skips non-skill dirs.
  let result = runSync(env);
  assert.strictEqual(result.status, 0, `sync failed: ${result.stderr}`);
  assert.deepStrictEqual(listSkillDirs(tmpTarget), ['alpha', 'beta']);
  assert.strictEqual(
    fs.readFileSync(path.join(tmpTarget, 'alpha', 'SKILL.md'), 'utf8'),
    'alpha v1\n'
  );

  // --check passes when in sync.
  result = runSync(env, ['--check']);
  assert.strictEqual(result.status, 0, `--check should pass: ${result.stderr}`);

  // Drift: edit source, remove one skill, add a stale mirror entry.
  fs.writeFileSync(path.join(tmpSource, 'alpha', 'SKILL.md'), 'alpha v2\n');
  fs.rmSync(path.join(tmpSource, 'beta'), { recursive: true, force: true });
  fs.mkdirSync(path.join(tmpTarget, 'ghost'), { recursive: true });
  fs.writeFileSync(path.join(tmpTarget, 'ghost', 'SKILL.md'), 'stale\n');

  // --check fails with a remediation hint.
  result = runSync(env, ['--check']);
  assert.strictEqual(result.status, 1, '--check should fail on drift');
  assert.match(result.stderr, /out of sync/);
  assert.match(result.stderr, /sync-skills-to-claude/);

  // Real sync repairs: update, prune ghost, report counts.
  result = runSync(env);
  assert.strictEqual(result.status, 0, `repair sync failed: ${result.stderr}`);
  assert.deepStrictEqual(listSkillDirs(tmpTarget), ['alpha']);
  assert.strictEqual(
    fs.readFileSync(path.join(tmpTarget, 'alpha', 'SKILL.md'), 'utf8'),
    'alpha v2\n'
  );
  // alpha existed from the first sync (update, not create); beta and ghost
  // are both pruned (source-deleted + orphaned mirror entry).
  assert.match(result.stdout, /0 created, 1 updated, 2 removed/);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 4. Mirror script registered in package.json.
const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
assert.strictEqual(
  pkg.scripts['skills:mirror'],
  'node scripts/sync-skills-to-claude.js',
  'package.json must register scripts:skills:mirror'
);
assert.ok(
  (pkg.scripts['ecc:test'] || '').includes('sync-skills-to-claude.js --check'),
  'ecc:test must gate the mirror with sync --check'
);

console.log('claude-skills-mirror: all checks passed');
