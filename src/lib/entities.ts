// The entity registry: every kind of thing the dashboard can open, with the
// route that shows it and the event-explorer filter behind "events with
// this". Links, the value menu, breadcrumbs, and prev/next all read from
// here, so a route rename is a one-line change (epic #25).

export type IocKind =
  | 'domain'
  | 'url'
  | 'credential'
  | 'command'
  | 'username'
  | 'password'
  | 'fingerprint'
  | 'user-agent'
  | 'cve'
  | 'signature'

export type EntityKind =
  | 'event'
  | 'session'
  | 'source'
  | 'network'
  | 'asn'
  | 'identity'
  | 'campaign'
  | 'agent-campaign'
  | 'cluster'
  | 'payload'
  | 'sensor'
  | 'recording'
  | 'country'
  | 'port'
  | IocKind

type EntityDef = {
  /** Singular noun, e.g. "source IP". */
  noun: string
  /** Page that shows this entity, if it has one yet. */
  href?: (id: string) => string
  /** Event-explorer / history query for "events with this value". */
  events?: (id: string) => string
  /** Values rendered in monospace (hashes, commands, credentials…). */
  isCode?: boolean
}

const q = encodeURIComponent
const history = (query: string) => `/history?q=${q(query)}`

export const ENTITIES: Record<EntityKind, EntityDef> = {
  event: { noun: 'event', href: (id) => `/events/${q(id)}`, isCode: true },
  session: { noun: 'session', href: (id) => `/sessions/${q(id)}`, events: (id) => history(`session:${id}`), isCode: true },
  source: { noun: 'source IP', href: (id) => `/sources/${q(id)}`, events: (id) => `/events?ip=${q(id)}` },
  network: { noun: 'network', href: (id) => `/networks/${q(id)}` },
  asn: { noun: 'autonomous system', href: (id) => `/asn/${q(id)}` },
  identity: { noun: 'attacker identity', href: (id) => `/identities/${q(id)}`, isCode: true },
  campaign: { noun: 'campaign', href: (id) => `/campaigns/${q(id)}` },
  'agent-campaign': { noun: 'agent campaign', href: () => '/agent-campaigns', isCode: true },
  cluster: { noun: 'cluster' },
  payload: { noun: 'payload', href: (id) => `/payloads/${q(id)}`, isCode: true },
  sensor: { noun: 'sensor', href: (id) => `/sensors/${q(id)}`, events: (id) => `/events?sensor=${q(id)}` },
  recording: { noun: 'recording', href: (id) => `/tty-replay/${q(id)}`, isCode: true },
  country: { noun: 'country', events: (id) => `/events?country=${q(id)}` },
  port: { noun: 'port', events: (id) => `/events?port=${q(id)}` },
  domain: { noun: 'domain', events: (id) => history(id), isCode: true },
  url: { noun: 'URL', events: (id) => history(id), isCode: true },
  credential: {
    noun: 'credential pair',
    href: (id) => clusterHref('credential', id),
    events: (id) => history(`username:${id.split(':')[0]}`),
    isCode: true,
  },
  command: { noun: 'command', events: (id) => history(id), isCode: true },
  username: { noun: 'username', events: (id) => history(`username:${id}`), isCode: true },
  password: { noun: 'password', events: (id) => history(id), isCode: true },
  fingerprint: { noun: 'fingerprint', href: (id) => clusterHref('fingerprint', id), isCode: true },
  'user-agent': { noun: 'user agent', events: (id) => history(id), isCode: true },
  cve: { noun: 'CVE', events: (id) => history(id) },
  signature: { noun: 'IDS signature', events: (id) => history(id) },
}

/** Infrastructure clusters live at /clusters/$kind/$value; an ASN cluster is
 * just the ASN's own page. */
export const clusterHref = (kind: string, value: string) => (kind === 'asn' ? `/asn/${q(value)}` : `/clusters/${kind}/${q(value)}`)

export const entityHref = (kind: EntityKind, id: string) => ENTITIES[kind].href?.(id)
