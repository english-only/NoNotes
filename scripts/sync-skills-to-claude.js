#!/usr/bin/env node
/**
 * Mirror curated skills/ into .claude/skills/ for harness auto-loading.
 *
 * Why this exists:
 *   ECC's canonical skill surface is `skills/` (SKILL.md per directory),
 *   but Claude Code project scope — and Freebuff, which embeds the Claude
 *   Code runtime — auto-loads skills only from `.claude/skills/` in the
 *   project root (plus `~/.claude/skills` and enabled plugins). Without a
 *   mirror, none of the 286 curated skills appear in the harness skill
 *   menu even though they are all in the repo.
 *
 * What it does:
 *   - Copies each `skills/<name>/SKILL.md` to `.claude/skills/<name>/SKILL.md`.
 *   - Flat, one-level mirror: bundled per-skill extras (rules/, scripts/,
 *     references/) stay in `skills/` and SKILL.md frontmatter must reference
 *     them relative to the canonical surface (../../<name>/... is out of
 *     scope here; curated skills are written to be self-contained).
 *   - Removes mirror entries whose source no longer exists (stale pruning).
 *
 * Usage:
 *   node scripts/sync-skills-to-claude.js            # sync (default)
 *   node scripts/sync-skills-to-claude.js --check    # exit 1 if out of sync
 *   node scripts/sync-skills-to-claude.js --clean    # remove mirror only
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
// Env overrides exist for hermetic tests; defaults target the real surfaces.
const sourceRoot =
  process.env.ECC_MIRROR_SOURCE || path.join(repoRoot, 'skills');
const targetRoot =
  process.env.ECC_MIRROR_TARGET || path.join(repoRoot, '.claude', 'skills');

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const cleanOnly = args.has('--clean');

function listSkillDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function main() {
  if (cleanOnly) {
    if (fs.existsSync(targetRoot)) {
      fs.rmSync(targetRoot, { recursive: true, force: true });
    }
    console.log('Removed .claude/skills mirror.');
    return 0;
  }

  const skillNames = listSkillDirs(sourceRoot);
  const mirrorable = skillNames.filter((name) =>
    fs.existsSync(path.join(sourceRoot, name, 'SKILL.md'))
  );

  if (mirrorable.length === 0) {
    console.error('No skills/*/SKILL.md found; nothing to mirror.');
    return 1;
  }

  if (!fs.existsSync(targetRoot)) {
    fs.mkdirSync(targetRoot, { recursive: true });
  }

  let created = 0;
  let updated = 0;
  let removed = 0;

  const existingMirror = new Set(listSkillDirs(targetRoot));
  const wanted = new Set(mirrorable);

  // Prune mirror entries whose source disappeared.
  for (const name of existingMirror) {
    if (!wanted.has(name)) {
      if (!checkOnly) {
        fs.rmSync(path.join(targetRoot, name), { recursive: true, force: true });
      }
      removed += 1;
    }
  }

  for (const name of mirrorable) {
    const source = path.join(sourceRoot, name, 'SKILL.md');
    const target = path.join(targetRoot, name, 'SKILL.md');
    const content = fs.readFileSync(source, 'utf8');

    if (!fs.existsSync(target)) {
      if (!checkOnly) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
      created += 1;
      continue;
    }

    const current = fs.readFileSync(target, 'utf8');
    if (current !== content) {
      if (!checkOnly) {
        fs.writeFileSync(target, content);
      }
      updated += 1;
    }
  }

  if (checkOnly) {
    if (created > 0 || updated > 0 || removed > 0) {
      console.error(
        `.claude/skills is out of sync: ${created} missing, ${updated} stale, ${removed} orphaned. Run: node scripts/sync-skills-to-claude.js`
      );
      return 1;
    }
    console.log(`.claude/skills is in sync (${mirrorable.length} skills).`);
    return 0;
  }

  console.log(
    `.claude/skills mirror updated: ${created} created, ${updated} updated, ${removed} removed, ${mirrorable.length} total.`
  );
  return 0;
}

process.exit(main());
