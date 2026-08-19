# DSH Plugin Standard

> The open specification for building **high-quality DeepSeek Harness (DSH) plugins** — so that every plugin on the internet, whoever writes it, follows the same contract, ships the same quality, and is checked by the same tooling.

[![Spec status](https://img.shields.io/badge/DSH%20Plugin%20Standard-v2.0.0-blue)](./STANDARD.md)
[![License: CC BY 4.0 (text) + MIT (tooling)](https://img.shields.io/badge/License-CC%20BY%204.0%20%2B%20MIT-lightgrey)](./LICENSE)

**中文版规范见 [STANDARD.md](./STANDARD.md) · English version at [STANDARD.en.md](./STANDARD.en.md)**

---

## Why this standard

DSH is a plugin platform. Bad plugins can crash the host, leak secrets, open local CSRF, corrupt data, or ship artifacts that don't install. This standard exists so that **anyone, anywhere** can write a DSH plugin that is:

- **Safe by default** — loopback+Origin-validated HTTP, no secret leaks, no arbitrary code execution without confirmation.
- **Lifecycle-clean** — uninstall and hot-reload leave nothing behind.
- **Contract-consistent** — package name, patch, client wrapper, and README always agree; one descriptor, no hand-written drift.
- **Verifiable & publishable** — a one-command checker enforces the hard rules, and a review checklist covers the rest.

## Quick start

### 1. Read the standard

- [中文版 STANDARD.md](./STANDARD.md)
- [English STANDARD.en.md](./STANDARD.en.md)

### 2. Check your plugin (one command)

```sh
# without installing anything
npx dsh-plugin-standard /path/to/dsh-my-plugin

# deep pre-release check (npm pack --dry-run + artifact review)
npx dsh-plugin-standard /path/to/dsh-my-plugin --pack

# JSON output for CI
npx dsh-plugin-standard /path/to/dsh-my-plugin --json
```

Or copy the self-contained checker into your repo and wire it into `verify`:

```sh
cp scripts/verify-plugin.mjs /path/to/dsh-my-plugin/scripts/
```

In `package.json`:

```json
{
  "scripts": {
    "verify": "node scripts/verify-plugin.mjs ."
  }
}
```

CI gate: run `npm run verify` on every PR and before release.

### 3. Start from the compliant template

A minimal, standard-compliant bundle skeleton lives in [`template/`](./template/bundle). Copy it, `npm install`, build, and run `verify-plugin`.

### 4. Tell the world your plugin complies

Add to your README:

```md
[![DSH Plugin Standard](https://img.shields.io/badge/DSH%20Plugin-Standard%20v2.0.0-blue)](https://github.com/lanbaolu/dsh-plugin-standard)
```

```md
This plugin complies with the [DSH Plugin Standard v2.0](https://github.com/lanbaolu/dsh-plugin-standard).
Verified with `npx dsh-plugin-standard` — 0 MUST violations.
```

## What gets checked automatically

- `type: module`; `main`/`types`/`exports` point to real artifacts
- client declaration `dsh.client` ↔ `exports["./client"]` pairing
- `dsh.bundle.patch` points to a real top-level-array YAML
- patch insert `id` unique, insert `name` resolvable (package name or declared child)
- name agreement: patch name / client wrapper id / scoped source `export const name` = package name
- no `@deepseek-ai/*` in `dependencies` (shared runtimes are `peerDependencies`)
- scripts gates: `typecheck`/`build`/`test`/`verify`/`pack` (SHOULD)
- `engines.node`, `files` completeness (SHOULD)
- `--pack`: `npm pack --dry-run` passes

What is NOT auto-checked (needs human review — see Appendix B of the standard): HTTP auth logic, lifecycle cleanup, persistence atomicity, XSS, concurrency. The checker is a gate, not a substitute for review.

## Repository layout

```
dsh-plugin-standard/
├── STANDARD.md          # 规范正文（中文）
├── STANDARD.en.md       # Specification (English)
├── README.md            # Home page (this file)
├── CHANGELOG.md         # Spec version history
├── CONTRIBUTING.md      # How to propose changes
├── LICENSE              # MIT (tooling) — see LICENSE-STANDARD for the spec text
├── LICENSE-STANDARD     # CC BY 4.0 (spec text)
├── package.json         # npm package: `npx dsh-plugin-standard`
├── scripts/
│   └── verify-plugin.mjs   # self-contained compliance checker (no deps)
└── template/
    └── bundle/          # minimal compliant plugin skeleton
```

## Versioning & stability

- **SemVer.** A MUST/MUST-NOT change is a MAJOR bump. New SHOULD/MAY checks are MINOR.
- The checker version is the same as the standard version (currently `2.0.0`).
- Backward-incompatible spec changes require a migration note in `CHANGELOG.md`.

## Contributing

Found a gap? Want a stricter check? Open an issue or PR — see [CONTRIBUTING.md](./CONTRIBUTING.md).

Every spec change MUST ship with its executable check. "Rule without a checker" is not accepted.

## License

- **Spec text** (`STANDARD.md`, `STANDARD.en.md`): [CC BY 4.0](./LICENSE-STANDARD) — share and adapt with attribution.
- **Tooling** (`scripts/`, `template/`, `package.json`): [MIT](./LICENSE).
