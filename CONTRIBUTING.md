# Contributing to the DSH Plugin Standard

Thanks for helping make DSH plugins high-quality for everyone. This standard is only as good as the rules it actually enforces.

## Ground rules

1. **Every rule ships with its checker.** A new MUST clause MUST include a matching check in `scripts/verify-plugin.mjs` and a fixture that exercises it. "Rule without a checker" is not accepted.
2. **MUST changes are breaking.** Changing a MUST/MUST-NOT clause is a MAJOR semver bump and requires a migration note in `CHANGELOG.md`.
3. **Evidence over opinion.** Cite the real failure (bug report, plugin incident, review finding) that motivates a new rule.
4. **Keep it enforceable.** If a rule can't be statically checked and is hard to review by hand, reconsider it or split it.

## How to propose a change

### Option A — open an issue

Describe:

- the problem (concrete incident or gap),
- the proposed clause (exact wording, with MUST/SHOULD/MAY),
- how it should be checked.

### Option B — open a pull request

1. Fork and create a branch.
2. Edit the spec text in BOTH `STANDARD.md` (Chinese) and `STANDARD.en.md` (English).
3. Add/extend the checker in `scripts/verify-plugin.mjs`.
4. Add fixtures under `test/fixtures/` (an `ok` case and a `bad` case) and a test in `test/run.mjs`.
5. Run `npm test` — all fixtures must pass.
6. Bump the version in `package.json`, the spec tables, and the checker's `--version` output.
7. Update `CHANGELOG.md`.

## Local development

```sh
npm install        # no runtime deps; only for running tests
npm test           # runs test/run.mjs against fixtures
node scripts/verify-plugin.mjs /path/to/your/plugin
```

## Review checklist for a spec PR

- [ ] Both language versions updated identically
- [ ] New MUST clauses have executable checks + `ok`/`bad` fixtures
- [ ] Version bumped consistently (package.json, spec table, checker `--version`)
- [ ] Changelog updated
- [ ] Existing plugin corpus re-checked: no false positives introduced on known-compliant plugins
