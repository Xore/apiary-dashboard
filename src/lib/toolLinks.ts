// Links out to the deployment's other tools. Each pivots on the event's
// flow (its Community ID) when it has one, which answers "what happened on
// this connection"; otherwise on the source address, which answers "what
// else did this host do". A tool the deployment does not run gets no link.
import type { DeploymentLinks, HoneypotEvent } from '#/data/types'

export type ToolLink = { tool: 'EveBox' | 'Kibana' | 'Arkime' | 'VirusTotal'; href: string; purpose: string }

/** RFC 2606 placeholders left in the environment are no deployment. */
function usable(base: string | undefined): base is string {
  if (!base) return false
  try {
    const host = new URL(base).hostname.toLowerCase()
    return host !== 'example' && !host.endsWith('.example')
  } catch {
    return false
  }
}

const trim = (base: string) => base.replace(/\/+$/, '')

/** EveBox, Kibana and Arkime for one event, in that order. */
export function eventToolLinks(event: Pick<HoneypotEvent, 'srcIp' | 'timestamp' | 'communityId'>, links: DeploymentLinks): ToolLink[] {
  const flow = event.communityId
  const ip = event.srcIp
  const out: ToolLink[] = []
  // A Community ID is base64 ('+', '/', '='): unencoded, a '+' reads as a
  // space and the search quietly matches nothing.
  if (usable(links.evebox)) {
    const q = flow ? `community_id:"${flow}"` : ip
    out.push({ tool: 'EveBox', href: `${trim(links.evebox)}/#/inbox?q=${encodeURIComponent(q)}`, purpose: flow ? 'IDS alerts on this flow' : 'IDS alerts from this source' })
  }
  if (usable(links.kibana)) {
    const at = Date.parse(event.timestamp)
    const from = new Date(at - 5 * 60_000).toISOString()
    const to = new Date(at + 5 * 60_000).toISOString()
    const query = flow ? `network.community_id:"${flow}"` : ip
    const g = encodeURIComponent(`(time:(from:'${from}',to:'${to}'))`)
    const a = encodeURIComponent(`(query:(language:kuery,query:'${query}'))`)
    out.push({ tool: 'Kibana', href: `${trim(links.kibana)}/app/discover#/?_g=${g}&_a=${a}`, purpose: 'Every document around this moment' })
  }
  if (usable(links.arkime)) {
    const expression = flow ? `communityId == "${flow}"` : `ip == ${ip}`
    out.push({ tool: 'Arkime', href: `${trim(links.arkime)}/sessions?date=-1&expression=${encodeURIComponent(expression)}`, purpose: flow ? 'The packets of this flow' : 'Every session of this source' })
  }
  return out
}

/** A captured file on VirusTotal, by SHA-256. */
export const virusTotalLink = (sha256: string): ToolLink => ({ tool: 'VirusTotal', href: `https://www.virustotal.com/gui/file/${encodeURIComponent(sha256)}`, purpose: 'What other engines say about this file' })

/** The account console's own pages (Keycloak account console v2 routes). */
export function accountLinks(console: string | undefined) {
  if (!usable(console)) return undefined
  const base = console.endsWith('/') ? console : `${console}/`
  return { manageAccount: base, profile: `${base}#/personal-info`, security: `${base}#/security/signingin`, sessions: `${base}#/security/device-activity` }
}
