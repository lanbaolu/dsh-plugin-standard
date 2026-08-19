# dsh-my-plugin

A minimal **DSH Plugin Standard v2.0** compliant bundle skeleton.

[![DSH Plugin Standard](https://img.shields.io/badge/DSH%20Plugin-Standard%20v2.0.0-blue)](https://github.com/lanbaolu/dsh-plugin-standard)

## Quick start

```sh
npm install          # devDependencies only
npm run build        # tsc → lib/
npm run verify       # node scripts/verify-plugin.mjs .  (0 MUST violations)
npm run verify:pack  # deep pre-release check
```

## Install into a DSH profile

```sh
dsh plugin --profile web add /path/to/dsh-my-plugin
dsh --profile web --dump-config   # expect a `dsh-my-plugin` row
```

## Standard compliance

- `type: module`, `main/types/exports` point to real `lib/` artifacts
- `cordis.patch.yml`: top-level array, unique `id`, `name` == package name
- package name == patch name == source `export const name` == client wrapper id (when added)
- shared runtimes in `peerDependencies` only
- `typecheck` / `build` / `test` / `verify` / `pack` script gates present

## Adding a client (browser UI)

Follow DSH Plugin Standard §4 and the official DSH client docs:
- add `exports["./client"]` and `dsh.client.platform: "web"` (+ package-name `inject`)
- keep host/client as two tsc programs; client entry must be `.tsx`
- every slot/DOM/style/React root inside `ctx.effect` disposers
