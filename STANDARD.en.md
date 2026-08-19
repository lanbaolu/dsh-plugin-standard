# DSH Plugin Standard

> This document is the **formal specification** for DeepSeek Harness (DSH) plugin development. New plugins MUST follow it; existing plugins MUST migrate within a grace period.

| Item | Value |
|---|---|
| Status | **Adopted** |
| Version | 2.0.0 |
| Effective date | 2026-08-19 |
| Maintainers | DSH plugin maintenance group (this repository) |
| Scope | All DSH plugins, host-plane plugins, agent presets, workspace plugin families, and integrations of third-party/official plugins |
| Compliance check | `npx dsh-plugin-standard <plugin-dir>` or `node scripts/verify-plugin.mjs <plugin-dir>` (see Appendix A) |

---

## 0. Normative Semantics & Governance

### 0.1 Requirement levels (RFC 2119 style)

- **MUST / MUST NOT**: absolute requirements/prohibitions. Violation = non-compliant → **do not publish, do not assemble, review must reject**.
- **SHOULD / SHOULD NOT**: strong recommendations. If not met, the deviation MUST be documented; otherwise reviewers MUST flag it.
- **MAY**: optional.

### 0.2 Violation consequences

| Level | Consequence |
|---|---|
| MUST / MUST NOT violation | Blocks release and assembly; CI `verify-plugin` fails; code review rejects |
| SHOULD violation | Reviewer MUST flag; author documents rationale or files a TODO |
| Security/data red line (§9) | Immediate quarantine (fail-soft), rollback, fix within a deadline |

### 0.3 Exemption process

1. File a written exemption request: violated clause, reason, mitigations, and a recovery plan.
2. The exemption MUST be approved by the maintenance group and recorded in the Changelog.
3. Exemptions default to one release cycle; unrecovered exemptions are treated as MUST violations.

### 0.4 Change process

- Any edit MUST bump the version and update the Changelog, and MUST pass the full `verify-plugin` regression.
- Every new MUST clause MUST ship with a matching executable check in `verify-plugin.mjs`, so "a rule nobody checks" never happens.

---

## 1. Core Principles

- **P1 (MUST) Minimal surface**: declare a client only if you need a browser UI; build a bundle plugin only if you need runtime capabilities (services, HTTP, persistence, tools, timers); if you only touch prompts/tools/assembly and have no runtime capability, use an agent preset.
- **P2 (MUST) Single source of truth**: package name, patch name, source export name, client wrapper id, and README install command MUST agree; keep exactly ONE remote descriptor and derive everything else.
- **P3 (MUST) Cleanup-able lifecycle**: routes, listeners, timers, watchers, DOM, React roots, child processes, and temporary services MUST be owned by `ctx.effect`/disposers; nothing may leak on unload.
- **P4 (MUST) Default-deny / least exposure**: every local HTTP endpoint validates loopback + Host + Origin/Sec-Fetch-Site, caps body size, never leaks internal errors; privileged operations require auth, confirmation, and rollback.
- **P5 (MUST) Verifiable & publishable**: `typecheck/build/test/verify/npm pack` scripts exist; released artifacts (tgz/Git) match `files` and README; every critical fix ships with a regression test.

---

## 2. Package & Assembly Contract

### 2.1 package.json

- **2.1.1 (MUST)** `"type": "module"`.
- **2.1.2 (MUST)** `main`, `types`, and every `exports` entry point to real `lib/` artifacts; no entry may point to a missing file.
- **2.1.3 (MUST)** A package with a client MUST expose both `exports["./client"]` and `dsh.client.platform: "web"`; a host-only package MUST NOT declare `./client` or `dsh.client`.
- **2.1.4 (MUST)** `dsh.bundle.patch` MUST point to a real top-level-array YAML (usually `cordis.patch.yml`).
- **2.1.5 (MUST)** `dsh.client.inject` lists **package names** (browser module dependencies), not Cordis service names; service names go in the client source's `export const inject`.
- **2.1.6 (MUST)** Shared DSH/Cordis/React runtimes go in `peerDependencies`; any `@deepseek-ai/*` in `dependencies` is a MUST violation (unless exempted).
- **2.1.7 (MUST)** Name agreement: `package.json.name` = insert `name` in `cordis.patch.yml` = client wrapper `id` = Remote/Typert manifest `package` = README install command. The source `export const name` is the Cordis plugin id and MAY be a short name (e.g. `agent-teams`), but **if it contains `/` (scoped) it MUST equal the package name**; legacy-scope leftovers are forbidden (`verify-plugin` checks this).
- **2.1.8 (SHOULD)** Declare `engines.node` (e.g. `>=22`) and lock the same Node version in CI.
- **2.1.9 (SHOULD)** `files` is an explicit list covering every path referenced by `scripts` and README (screenshots/assets included).
- **2.1.10 (SHOULD)** When `private: false`, provide `publishConfig`, `repository`, `homepage`, `bugs`, `license`.

### 2.2 cordis.patch.yml

- **2.2.1 (MUST)** Top-level YAML array; each `insert` row has a globally unique `id`.
- **2.2.2 (MUST)** When overriding an earlier layer, `config` is replaced wholesale by row id and must restate required keys; no deep merge.
- **2.2.3 (MUST NOT)** Hand-edit user profile manifests; `dsh plugin` owns the bundles list.
- **2.2.4 (MUST)** Every insert `name` MUST resolve: it equals the bundle package name, or — for aggregate bundles mounting multiple plugin rows — it is a child package referenced by this package's `dependencies`/`peerDependencies`. Pointing at a legacy scope or undeclared dependency is forbidden.
- **2.2.5 (MUST NOT)** `id` must not be implicitly coupled to client/service keys.

### 2.3 Workspaces & release artifacts

- **2.3.1 (MUST)** Each sub-package's `exports` MUST match its build output; if tsc emits `lib/client/index.js`, do not declare `exports["./client"]: "./lib/client.js"`.
- **2.3.2 (MUST)** Any package declaring `exports["./client"]` MUST also declare `dsh.client`; client builds MUST emit matching `.d.ts` or adjust `types`.
- **2.3.3 (MUST)** `npm pack --dry-run` MUST pass; before release, diff the tgz's `package.json`, `cordis.patch.yml`, and `lib/` against the source tree (`verify-plugin --pack`).
- **2.3.4 (MUST)** README Files section, install commands, and screenshot paths MUST match the actual package; cross-platform commands MUST state their platform limits.

---

## 3. Host Development

### 3.1 Plugin shape

- **3.1.1 (MUST)** Function plugins export `name/inject/Config/apply`; `Config` uses `@deepseek-ai/schemastery` with defaults in the schema.
- **3.1.2 (MUST)** Service plugins use `Service` + async startup in `[Service.init]`; the constructor only declares the service key.
- **3.1.3 (MUST)** `inject` waits for services, not for sibling provider effects; dependencies on sibling behavior MUST fail loudly at first real use, never inside `apply()`.

### 3.2 Lifecycle & resource ownership

- **3.2.1 (MUST)** Routes, listeners, timers, watchers, sockets, React roots, DOM, temporary services, and child processes are owned by the current fiber via `ctx.effect(() => disposer, label)`.
- **3.2.2 (MUST)** `ctx.on`/`host.on`/`window.addEventListener` MUST be wrapped in `ctx.effect` or removed by the disposer; never rely on implicit framework cleanup.
- **3.2.3 (MUST)** Disposer order: stop external entry points / unregister → cancel/await in-flight work → close resources.
- **3.2.4 (MUST)** Async polling, fetch, timeouts, and archiving MUST have cancelled/unmount guards; no setState or stale-input write-back after unload.

### 3.3 HTTP / WebServer routes

- **3.3.1 (MUST)** Every custom route (including read-only GET) validates **loopback + Host + Origin/Sec-Fetch-Site**; no "read-only exception".
- **3.3.2 (MUST)** Write routes: method whitelist, body size cap (256KB–1MB), JSON shape validation, parameter whitelist.
- **3.3.3 (MUST)** Paths defend against traversal: wrap `decodeURIComponent` in try, strip to a whitelist, and double-confine with `realpath`.
- **3.3.4 (MUST)** Sensitive/realtime responses use `Cache-Control: no-store`; errors return fixed codes/messages; `error.message`/`String(error)` goes to server logs only.
- **3.3.5 (MUST NOT)** Let arbitrary web pages trigger high-cost local operations (LLM calls, injection, unload, file rewrites, config changes) via DNS rebinding/CSRF.

### 3.4 Tools

- **3.4.1 (MUST)** `description` states when to call, preconditions, failure semantics, and side effects; `parameters` and `output.schema` use the `@deepseek-ai/dsh-tools` value-schema DSL.
- **3.4.2 (MUST)** `output.render` returns stable, compact, decidable text.
- **3.4.3 (MUST)** Read session/workspace/owner from `exec.agent`, never from global process state.
- **3.4.4 (MUST)** Observe/forward `exec.signal` on long tasks; writes have idempotency, locks, or conflict strategies.
- **3.4.5 (MUST)** High-cost/long-running tools have timeouts, budget caps, async support, or cost hints.
- **3.4.6 (SHOULD)** Sub-agent/member isolation uses `toolFilter.deny` to strip privileged tools (bash/fs/web); default-deny beats default-allow.

### 3.5 Persistence & concurrency

- **3.5.1 (MUST)** Human-readable JSON writes: temp file in the same directory + `fsync` + `rename` atomic publish; direct `writeFileSync` overwrite is forbidden.
- **3.5.2 (MUST)** Serialize read-modify-write of the same resource: promise-chain locks in-process; no-clobber (`link()`+`unlink()`) or DB transactions cross-process.
- **3.5.3 (MUST)** Append logs handle torn tails; incremental stats MUST detect log rewrite/shrink (first seq/length/revision), never only `consumed < count`.
- **3.5.4 (MUST)** DB CAS: `UPDATE` and version increment in the SAME transaction; no bump on failure.
- **3.5.5 (MUST)** All timer/interval/async-init cleanup registers into the disposer, not only on failure branches.
- **3.5.6 (MUST NOT)** Silently overwrite concurrent creations with `rename()`; scatter user data via `process.cwd()`.
- **3.5.7 (MUST NOT)** Delete/restore logic truncates patch/config by raw line numbers; operate on parsed whole blocks and preserve what follows.

### 3.6 Child processes / external programs

- **3.6.1 (MUST)** Use non-shell `spawn` with fixed argument arrays; no shell string concatenation.
- **3.6.2 (MUST)** Executable paths are fixed in-package or validated absolute/whitelisted; user-configurable `pythonBin`/CLI paths are code-execution surfaces and MUST carry explicit warnings or confirmation.
- **3.6.3 (MUST)** Child processes have timeouts, exit/error listeners, and a `kill` fallback; background/cached paths are cancellable — no orphan processes.
- **3.6.4 (MUST)** Forward only the minimal credential env needed for the selected backend.

### 3.7 Privileged operations (injectors, quarantine, file rewriting, …)

- **3.7.1 (MUST)** Arbitrary code execution (`new Function`/eval/dynamic import of user scripts), shell, HTTP writes, patch/profile/package.json rewriting, and patching official files require: auth + explicit confirmation + rollback + audit.
- **3.7.2 (MUST)** When rewriting kernel/third-party files: back up first, verify against content-hash/template anchors, then write; no backup-less "feature re-patch".
- **3.7.3 (MUST)** Self-heal/auto-recovery has failure backoff and a max attempt count; a bad version must never cause a startup crash loop.

---

## 4. Client Development

### 4.1 Types & build

- **4.1.1 (MUST)** Host and Client use two tsc programs (host excludes `src/client`; client includes DOM/react-jsx) to avoid `Context` declaration collisions.
- **4.1.2 (MUST)** Any file with JSX is `.tsx`.
- **4.1.3 (MUST)** The client bundle emits `window.__ModuleLoader__.load({ id, factory })`; `react` is externalized; runtimes unknown to the browser module table (e.g. `zod`) are inlined as needed.
- **4.1.4 (MUST)** Browser imports respect the module table: type-only imports may cross packages; runtime value collaboration goes through Cordis services/remotes/slots.

### 4.2 UI lifecycle & security

- **4.2.1 (MUST)** Slot registrations, controllers, listeners, styles, DOM, and React roots dispose with the client fiber; use `ctx.effect(() => ctx.slots.inject(...))`.
- **4.2.2 (MUST)** Per-session state is bucketed by `SessionId` and cleaned on session close/dispose (fetches, listeners, entry maps) — not only on global reset/TTL.
- **4.2.3 (MUST NOT)** Render user/model content with `dangerouslySetInnerHTML`; error and candidate text render as React text nodes.
- **4.2.4 (MUST)** Polling uses `no-store`, in-flight guards, response-shape validation, and unmount guards; keep the last good snapshot on failure.
- **4.2.5 (MUST)** Overlays/dialogs support Esc, focus trap/restore, `aria-*`, `:focus-visible`, and reduced motion; navigation collapses them.
- **4.2.6 (MUST)** Async submit buttons use ref-based mutex, not only state-driven `disabled`.
- **4.2.7 (SHOULD)** Prefer semantic slots over body portals; when a portal is required, use official seams such as `shell.overlay`.

---

## 5. Data Correctness

- **5.1 (MUST)** Incremental stats detect log rewrite/shrink and re-fold; duplicate `(turn,step)` samples are deducted via a keyed index, not just compared to `last`.
- **5.2 (MUST)** A message is delivered exactly once; enqueue success is not consumption success — ack after actual consumption/next idle; mailbox fallback and live wake share one per-recipient FIFO/lock.
- **5.3 (MUST)** Business-id rules agree between host and client; composite keys (`owner:businessId`) for historical/archived data with repeatable ids.
- **5.4 (MUST)** Attempt/capability boundaries enforce checks for non-owners; clearing `attemptId` on reassign/remove must leave no bypass window.
- **5.5 (MUST)** In-process tasks/history are documented as "lost on restart"; every in-process Map has a cleanup strategy (LRU, session deletion, tail deletion).

---

## 6. Verification & Release Gates

- **6.1 (MUST)** `scripts` cover `typecheck`, `build`, `test` (when there is logic), `verify`, and `pack` (or `npm pack --dry-run`).
- **6.2 (MUST)** CI runs typecheck + test + build + `npm pack --dry-run` + `npm audit`; `engines.node` matches the CI Node version.
- **6.3 (MUST)** Critical fixes ship regression tests: timeout/cancel, unload cleanup, concurrency races, rewrite detection, patch dedupe, path escape, ReDoS.
- **6.4 (MUST)** Pre-release checks: `npm pack --dry-run` contains only necessary files; tgz `package.json`/`cordis.patch.yml` match the source tree; all README-referenced assets are in `files`.
- **6.5 (MUST)** Install from a fresh profile using the README command; `--dump-config` shows the plugin row; after Host/Client interface changes, run e2e in an isolated `DSH_HOME` + dedicated port — never touch a running instance.
- **6.6 (MUST NOT)** Publish `private: true` or ship `.venv`, `node_modules`, `scores/`, `backup/`, or other non-essential artifacts.
- **6.7 (MUST NOT)** README claims UI/features whose code/files are absent from the artifact.

---

## 7. Special Forms

### 7.1 Host-plane plugins (mode-boost, super-injector, …)

- **7.1.1 (MUST)** Satisfy the standard bundle contract; the packed tgz still contains `dsh.bundle.patch` and `cordis.patch.yml`.
- **7.1.2 (MUST)** When replacing system prompts, never drop existing persona/sections wholesale; merge sections and preserve safety/language constraints.
- **7.1.3 (MUST)** Privileged capabilities follow §3.7.

### 7.2 Agent presets (router-standard, …)

- **7.2.1 (MUST)** Boundary: prompt/tool/assembly-only with no service/timer/HTTP/persistence/client → agent preset; any runtime capability → bundle plugin.
- **7.2.2 (MUST)** `files` covers every path referenced by `scripts`; `npm test` imports MUST match the real directory layout.
- **7.2.3 (MUST)** Assembly references point only to files inside the preset; README Files section, install command, and file names stay one source of truth.
- **7.2.4 (MUST)** Each fix has a unit test anchor; diff the tgz against current `files` before release.

### 7.3 Third-party/official plugins (modlens, openwolf, …)

- **7.3.1 (MUST)** Before integration, review against this standard's security baseline: HTTP auth consistency, temp-file/child-process policy, default resource cost, implicit writes to user workspaces, and tool-count context bloat.
- **7.3.2 (MUST NOT)** Locally patch and re-publish upstream issues; prefer submitting/waiting for upstream fixes, and locally only disable entry points via config.
- **7.3.3 (MUST)** Plugins that write `AGENTS.md`/`.dshwolf` inform the user before first enable, or default to off.

---

## 8. Compliance Gates (How the Standard Gets Enforced)

1. **(MUST) Checker**: every plugin repo's `verify` runs `node scripts/verify-plugin.mjs .` (copy the script from this standard, or install `dsh-plugin-standard`); CI MUST include it.
2. **(MUST) Review gate**: code review uses this standard as the sole basis, following Appendix B; MUST violations reject the merge.
3. **(MUST) Release gate**: `verify-plugin --pack` MUST pass before tagging/publishing, confirming tgz matches the source tree.
4. **(SHOULD) README badge**: plugin README adds a line: "Compliant with DSH Plugin Standard v2.0" and notes `verify-plugin` was run.
5. **(SHOULD) AGENTS.md pointer**: plugin repo `AGENTS.md` points to this standard so coding agents load it before work.

---

## 9. Red Lines (Do-Not-Repeat — all MUST)

These failures happened in this project. No plugin may reintroduce them:

1. **No local-link modified builds for dsh-at-file**: profiles use the official release; local workspace modifications MUST be clearly separated from the official version.
2. **Patch dedupe keeps the LAST entry per id**: src/scripts share one `lib/patch.js`.
3. **Incremental stats detect log rewrite**: live sessions validate first seq/length/revision; duplicate samples deducted by key; loopback HTTP endpoints validate Origin/Sec-Fetch-Site.
4. **autoDream machine writes MUST pass `{ actor: 'autoDream' }`** to avoid polluting reflection data.
5. **`update_task` enforces `attempt_id` for members**: no terminal state without it, and none during the reassign window.
6. **LLM streams MUST have timeout/cancel**: Host 60s AbortController + Promise.race; Client 65s timeout + mountedRef + disposer abort.
7. **File-reading tools share the index's sensitive-file denylist**: `wolf_file`-style tools must not bypass `.env`/secret skips; symlinks are double-confined with `realpath`.
8. **Quarantine/restore tools must not truncate patches**: operate on whole blocks and preserve what follows; config/patch writes back up first, write atomically, and roll back.
9. **Bad-plugin self-heal MUST have backoff**: auto-recovery must never cause a host startup crash loop; test with `dev_inject_plugin`, persist only after verification.
10. **patch name / client wrapper id / Remote-Typert package MUST equal the package name**; scoped source `export const name` MUST equal the package name (no legacy scope). `verify-plugin` checks this before release.
11. **Packed tgz metadata MUST be verified**: tgz MUST contain `dsh.bundle.patch` and `cordis.patch.yml`.
12. **No hand-written triple Remote contract**: one descriptor is the source; Typert manifest is derived or tested against it.

---

## Appendix A: Using the Compliance Checker

```sh
# Option 1: run from the standard package / global (no copy needed)
npx dsh-plugin-standard .

# Option 2: plugin repo embeds the checker (copied from dsh-plugin-standard/scripts/verify-plugin.mjs)
node scripts/verify-plugin.mjs

# Check a specific directory
node scripts/verify-plugin.mjs /path/to/dsh-my-plugin

# Deep pre-release check (npm pack --dry-run + artifact review)
node scripts/verify-plugin.mjs /path/to/dsh-my-plugin --pack

# JSON output for CI
node scripts/verify-plugin.mjs /path/to/dsh-my-plugin --json
```

Exit codes: `0` = no MUST violation; `1` = MUST violation(s); `2` = directory unusable / bad args.

Checked clauses: 2.1.1–2.1.10 manifest integrity; 2.2.1–2.2.4 patch contract; 2.3.1–2.3.4 exports/files/release consistency; 2.1.7 name agreement; 2.1.6 peer-only shared runtimes; 6.1 script gates.

> Note: this is a static gate, not a full review. Lifecycle, HTTP, persistence, and XSS rules in §3/§4/§5 still require human review per Appendix B.

## Appendix B: Review Checklist

- [ ] `verify-plugin` passes (0 MUST violations)
- [ ] `package.json.name` = patch `name` = client wrapper `id` = README install name; scoped `export const name` equals package name
- [ ] `exports`/`types`/`files` point to real artifacts; `npm pack --dry-run` passes; tgz matches source
- [ ] host-only has no `./client`/`dsh.client`; client packages have `exports["./client"]` + `dsh.client.platform: "web"` + package-name `inject`
- [ ] All resources (routes/listeners/timers/watchers/DOM/styles/React roots/child processes/temp services) inside `ctx.effect`/disposers
- [ ] All HTTP routes validate loopback + Host + Origin/Sec-Fetch-Site; body caps; no error leakage
- [ ] Persistence: tmp + fsync + rename; concurrency locks/no-clobber; rewrite detection; transactional CAS
- [ ] Tools: schema/description/render complete; long tasks have timeout/budget/async; privileged tools isolated
- [ ] Client: no `dangerouslySetInnerHTML`; per-session caches cleaned on session lifecycle; polling has unmount guards
- [ ] `typecheck`, `build`, `test`, `verify`, `pack` pass; CI includes audit/pack
- [ ] Fresh-profile install via README; isolated e2e passes; running instance untouched
- [ ] All red lines (§9) satisfied

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-19 | Initial draft (rules document) |
| 2.0.0 | 2026-08-19 | Promoted to an open standard: RFC 2119 semantics, violation matrix, exemption & change processes, compliance gates (`verify-plugin`), Appendices A/B, numbered red lines |
