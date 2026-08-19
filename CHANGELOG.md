# Changelog

All notable changes to the DSH Plugin Standard (spec text + `verify-plugin` tooling).

## 2.0.0 — 2026-08-19

- Promoted the rules document to an **open formal standard**:
  - RFC 2119 requirement levels (MUST / MUST NOT / SHOULD / SHOULD NOT / MAY)
  - Violation-consequence matrix
  - Exemption process and change process
  - Compliance gates: `verify-plugin` checker, review gate, release gate
  - Numbered red lines (Do-Not-Repeat)
  - English version (`STANDARD.en.md`)
- Checker `verify-plugin.mjs`:
  - Self-contained, zero-dependency, copyable into any plugin repo
  - Checks §2 manifest/patch/name/exports consistency, §2.1.6 peer-only runtimes, §6.1 script gates
  - `--pack` deep release check, `--json` CI output, `--version`
  - Correctly treats short source `export const name` (e.g. `agent-teams`) as allowed, while forbidding scoped-name/package-name mismatches and legacy scopes
  - Correctly handles aggregate bundles whose patch mounts multiple declared child packages
- Added `template/bundle` — a minimal compliant plugin skeleton.

## 1.0 — 2026-08-19

- Initial rules document (DSH 插件规则 v1.0).

## 2.0.0+ (tooling only)

- Added `scripts/publish.sh` — the fixed official-registry publish command (`npm publish --registry https://registry.npmjs.org --access public`), with pre-publish `npm test` gate and explicit OTP handoff to the maintainer.
