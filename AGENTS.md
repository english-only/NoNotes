# NoNotes + Everything Claude Code (ECC)

**Version:** 2.2.1

# Everything Claude Code (ECC) — Agent Instructions

This repository combines the **NoNotes** study application (Next.js) with the **ECC** (Everything Claude Code) agent-harness surfaces, providing 68 specialized agents, 286 skills, 94 commands, hooks, rules, and MCP conventions.

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any app code. Heed deprecation notices.

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design and scalability | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality and maintainability | After writing/modifying code |
| security-reviewer | Vulnerability detection | Before commits, sensitive code |
| spec-miner | Brownfield spec extraction | Onboarding brownfield projects to spec-driven development |
| build-error-resolver | Fix build/type errors | When build fails |
| e2e-runner | End-to-end Playwright testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation and codemaps | Updating docs |
| cpp-reviewer | C/C++ code review | C and C++ projects |
| cpp-build-resolver | C/C++ build errors | C and C++ build failures |
| fsharp-reviewer | F# functional code review | F# projects |
| docs-lookup | Documentation lookup via Context7 | API/docs questions |
| go-reviewer | Go code review | Go projects |
| go-build-resolver | Go build errors | Go build failures |
| kotlin-reviewer | Kotlin/Android/KMP projects | Kotlin code review |
| kotlin-build-resolver | Kotlin/Gradle build errors | Kotlin build failures |
| database-reviewer | PostgreSQL/Supabase specialist | Schema design, query optimization |
| python-reviewer | Python code review | Python projects |
| django-reviewer | Django apps, DRF APIs, ORM, migrations | Django code review |
| django-build-resolver | Django build, migration, and setup errors | Django startup, dependency, migration, collectstatic failures |
| java-reviewer | Java and Spring Boot code review | Java/Spring Boot projects |
| java-build-resolver | Java/Maven/Gradle build errors | Java/Maven/Gradle build failures |
| loop-operator | Autonomous loop execution | Run loops safely, monitor stalls, intervene |
| harness-optimizer | Harness config tuning | Reliability, cost, throughput |
| rust-reviewer | Rust code review | Rust projects |
| rust-build-resolver | Rust build errors | Rust build failures |
| pytorch-build-resolver | PyTorch runtime/CUDA/training errors | PyTorch build/training failures |
| mle-reviewer | Production ML pipeline review | ML pipelines, evals, serving, monitoring, rollback |
| rag-pipeline-reviewer | RAG pipeline review | Retrieval quality, chunking, reranking, RAGAS evaluation coverage |
| typescript-reviewer | TypeScript/JavaScript code review | TypeScript/JavaScript projects |

## Agent Orchestration

**ECC is the operating default.** Every task runs through the ECC harness natively — do not wait to be asked:

1. **Methodology from `skills/`** — load the relevant SKILL.md before acting: `tdd-workflow` for behavioral changes, `verification-loop` before claiming anything is done, `security-review` for auth/input/secrets/API endpoints, `react-performance` + `benchmark-optimization-loop` for anything user-facing and slow, `search-first` for research.
2. **Review from `agents/`** — apply the matching agent's checklist inline at the review stage: `code-reviewer` + `typescript-reviewer` on every diff, `security-reviewer` on anything touching API routes, keys, or user input, `build-error-resolver` when the gate is red, `architect` before cross-cutting refactors.
3. **Rules from `rules/` are binding** — immutability, error handling, file-size limits; they constrain all code written here.
4. **Be explicit about harness limits** — if the runtime cannot spawn subagents, read the agent/skill files directly and apply their checklists inline; never skip a stage because a subagent isn't available.

Use agents proactively without user prompt:
- Complex feature requests → **planner**
- Code just written/modified → **code-reviewer**
- Bug fix or new feature → **tdd-guide**
- Architectural decision → **architect**
- Security-sensitive code → **security-reviewer**
- Brownfield project onboarding → **spec-miner**
- Autonomous loops / loop monitoring → **loop-operator**
- Harness config reliability and cost → **harness-optimizer**
- RAG/retrieval pipeline changes → **rag-pipeline-reviewer**

Use parallel execution for independent operations — launch multiple agents simultaneously.

## Security Guidelines

**Before ANY commit:**
- No hardcoded secrets (API keys, passwords, tokens)
- All user inputs validated
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized HTML)
- CSRF protection enabled
- Authentication/authorization verified
- Rate limiting on all endpoints
- Error messages don't leak sensitive data

**Secret management:** NEVER hardcode secrets. Use environment variables or a secret manager. Validate required secrets at startup. Rotate any exposed secrets immediately.

**If security issue found:** STOP → use security-reviewer agent → fix CRITICAL issues → rotate exposed secrets → review codebase for similar issues.

## Coding Style

**Immutability (CRITICAL):** Always create new objects, never mutate. Return new copies with changes applied.

**File organization:** Many small files over few large ones. 200-400 lines typical, 800 max. Organize by feature/domain, not by type. High cohesion, low coupling.

**Error handling:** Handle errors at every level. Provide user-friendly messages in UI code. Log detailed context server-side. Never silently swallow errors.

**Input validation:** Validate all user input at system boundaries. Use schema-based validation. Fail fast with clear messages. Never trust external data.

## Performance Rules (Ingestion & Bulk DB Writes)

Learned the hard way while fixing slow large-PDF ingestion (57 MB textbook took minutes to process):

1. **Never write rows in a loop.** One IndexedDB/Dexie transaction per row is pathologically slow at scale — 1,000 chunks measured **4,067 ms** via a per-row `createChunk` loop vs **76 ms** via a single `bulkAdd` (53×). Batch writes exist for this: prefer `createChunks` (chunk-repository), `bulkAdd`/`bulkPut` inside a `db.transaction`, or a single composed write. Only loop per-row when each row genuinely needs its own read-validate-write cycle.

2. **Parallelize independent I/O with bounded concurrency.** Sequential `await` loops over pages/URLs/rows serialize independent work. Use a worker-pool pattern (8 workers measured as a safe default for pdf.js page extraction); write results into a preallocated array indexed by input order so output stays deterministic.

3. **Long operations must report progress.** Any processing expected to exceed ~1 s (PDF extraction, chunking, generation) must surface progress to the UI (callback → state → visible status text/bar). Silence reads as a hang; a hung-looking upload is the #1 reported UX bug even when throughput is fine.

4. **Measure before and after (benchmark-optimization-loop skill).** No optimization without a baseline number, a variant table, and a correctness gate (existing tests + output equivalence). Record the winning variant's measurement next to the code that implements it.

5. **When optimizing anything user-facing in this repo, activate the `react-performance` and `benchmark-optimization-loop` skills first**, and use the `performance-optimizer` agent for review of the change.

## Testing Requirements

**Minimum coverage: 80%** (ECC surface; app targets documented in the app test plan)

Test types:
1. **Unit tests** — Individual functions, utilities, components
2. **Integration tests** — API endpoints, database operations
3. **E2E tests** — Critical user flows

**TDD workflow:**
1. Write test first (RED) — test should FAIL
2. Write minimal implementation (GREEN) — test should PASS
3. Refactor (IMPROVE) — verify coverage

## Development Workflow

1. **Plan** — Use planner agent, identify dependencies and risks, break into phases
2. **TDD** — Use tdd-guide agent, write tests first, implement, refactor
3. **Review** — Use code-reviewer agent immediately, address CRITICAL/HIGH issues
4. **Capture knowledge in the right place**
   - Personal debugging notes, preferences, and temporary context → auto memory
   - Team/project knowledge → the project's existing docs structure
5. **Commit** — Conventional commits format, comprehensive PR summaries

## Workflow Surface Policy

- `skills/` is the canonical ECC workflow surface.
- New workflow contributions should land in `skills/` first.
- `commands/` is a legacy slash-entry compatibility surface and should only be added or updated when a shim is still required for migration or cross-harness parity.
- `.claude/skills/` mirrors curated skills for harnesses that auto-load that path (Freebuff, Claude Code); regenerate via `node scripts/sync-skills-to-claude.js`.

## App Commands (NoNotes)

```bash
npm run dev         # Next.js dev server
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npm run test:e2e    # playwright
```

## ECC Commands

```bash
npm run ecc:test          # ECC validators + full ECC test suite
node scripts/ci/validate-skills.js   # skills frontmatter validation
npm run ecc:catalog:check # catalog truth check
```

## Project Structure

```
app/, components/, lib/   — NoNotes application (Next.js App Router)
agents/          — 68 specialized subagents
skills/          — 286 workflow skills and domain knowledge
.claude/skills/  — flat mirror of skills/ for harness auto-loading
commands/        — 94 slash commands
hooks/                    — trigger-based automations
rules/                    — always-follow guidelines (common + per-language)
scripts/                  — cross-platform Node.js utilities (ECC)
mcp-configs/              — MCP server configurations
tests/                    — ECC test suite
```

## Git Workflow

**Commit format:** `<type>: <description>` — Types: feat, fix, refactor, docs, test, chore, perf, ci
