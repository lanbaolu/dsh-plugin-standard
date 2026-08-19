/**
 * dsh-my-plugin — host entry (function plugin).
 *
 * Standard: DSH Plugin Standard v2.0
 * - name/inject/Config/apply shape
 * - every resource owned by ctx.effect
 * - Config via @deepseek-ai/schemastery with defaults in schema
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-my-plugin'
export const inject = ['tools']

export interface Config {
  /** Master switch. */
  enabled: boolean
}

export const Config = z.object({
  enabled: z.boolean().default(true),
})

export function apply(ctx: Context, config: Config): void {
  if (!config.enabled) return

  // Example: register a tool (all owned by ctx.effect).
  // ctx.effect(() => ctx.tools.register(defineTool({ ... })), 'dsh-my-plugin: tool')

  // Example: an HTTP route with loopback + Origin checks per §3.3.
  // const web = ctx.get('webServer') ?? ctx.get('httpServer')
  // ctx.effect(() => web.register({ kind: 'exact', path: '/plugins/dsh-my-plugin/state', handler }), 'dsh-my-plugin: route')
}
