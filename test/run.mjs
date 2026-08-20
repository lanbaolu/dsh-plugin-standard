#!/usr/bin/env node
/**
 * Test harness for the DSH Plugin Standard compliance checker.
 * Runs the checker against `ok` and `bad` fixtures and asserts exit behavior.
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checker = resolve(ROOT, 'scripts/verify-plugin.mjs')

const cases = [
  { dir: 'test/fixtures/ok', expect: 0, note: 'compliant fixture' },
  { dir: 'test/fixtures/bad-name', expect: 1, note: 'patch insert name mismatch' },
  { dir: 'test/fixtures/bad-deps', expect: 1, note: '@deepseek-ai/* in dependencies' },
  { dir: 'test/fixtures/ok-koishi', expect: 0, note: 'koishi compatible (auto mode, peerDeps.koishi present)' },
  { dir: 'test/fixtures/bad-koishi-nopeer', expect: 1, note: 'koishi missing peerDependencies.koishi' },
  { dir: 'test/fixtures/ok-compat', expect: 0, note: 'compat: 原生 Compliant', flags: ['--compat'] },
  { dir: 'test/fixtures/compat-old', expect: 0, note: 'compat: 旧 key/旧包名 → COMPAT（可 shim，不 FAIL）', flags: ['--compat'] },
  { dir: 'test/fixtures/compat-bad', expect: 1, note: 'compat: 未知服务 key → Not-Compliant（FAIL）', flags: ['--compat'] },
]

let failed = 0
for (const c of cases) {
  const dir = resolve(ROOT, c.dir)
  const res = spawnSync(process.execPath, [checker, dir, '--json', ...(c.flags ?? [])], { encoding: 'utf8' })
  let json
  try {
    json = JSON.parse(res.stdout)
  } catch {
    json = null
  }
  const got = json ? (json.summary.fail > 0 ? 1 : 0) : 2
  const ok = got === c.expect
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.note}: must-fails=${json ? json.summary.fail : 'parse-error'} exitCode=${got} (expected ${c.expect})`)
  if (!ok) failed++
}

process.exit(failed ? 1 : 0)
