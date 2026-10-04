// Backend event row → the page's HoneypotEvent. Pure; nothing calls the
// backend yet. Wire shape: ../contracts/events.ts, which is shared with
// #75 and with every slice that lists events.
//
// "": on a row means absent — the backend builds each pivot with
// unwrap_or("") — so it maps to an omitted optional field, never to "".

import type { EventRow } from '../contracts/events'
import type { HoneypotEvent, ProviderClass } from '../types'

/** HoneypotEvent fields the event row does not carry, and why:
 *
 * - `type`, `severity` — the row has no event kind or severity of its own;
 *   `detail` is the sensor's rendered sentence, not a classification.
 * - `eventName` — the sensor's own event name (`cowrie.login.failed`,
 *   `NEW_CONNECTION`, …) is inside `record.honeypot` under whatever key
 *   that sensor writes it as, not lifted to the row.
 * - `srcPort` — the row carries only the destination port. The source port
 *   lives in the source document, not in `EventRow`.
 * - `techniques` — the ATT&CK mapping is a pipeline result; `pivots.alert`
 *   carries the alert string, not a technique list.
 * - `city` — the row has `source.geo.country_iso_code` only.
 * - `organization` — the decoy org. `pivots.org` is the ATTACKER's
 *   network org (`source.as.org`), a different value that the row does
 *   carry as `org`.
 */
export type EventRowGap = 'type' | 'severity' | 'eventName' | 'srcPort' | 'techniques' | 'city' | 'organization'

const PROVIDERS: readonly ProviderClass[] = ['network', 'hosting', 'cloud', 'scanner', 'blocklist:spamhaus']

/** "" on the wire means absent. */
const opt = (s: string): string | undefined => (s === '' ? undefined : s)

export function toHoneypotEvent(row: EventRow): Omit<HoneypotEvent, EventRowGap> {
  const p = row.pivots
  const ics = p.ics_severity
  return {
    id: row.id,
    timestamp: row.time,
    sensor: row.sensor,
    protocol: row.proto,
    srcIp: row.src_ip,
    srcIpClaimed: opt(row.src_ip_claimed ?? ''),
    dstPort: Number(row.port) || 0,
    country: row.country,
    asn: p.asn,
    sessionId: row.session,
    username: opt(p.user),
    password: opt(p.pass),
    command: opt(p.command),
    summary: row.detail,
    // The sensor's own object, passed through as written (credentials
    // already replaced with [redacted] for the two decoys the backend
    // scrubs — see EsRecord).
    fields: row.record.honeypot ?? {},
    persona: opt(p.persona),
    site: opt(p.site),
    asset: opt(p.asset),
    fingerprint: opt(p.fingerprint),
    fingerprintKind: opt(p.fingerprint_kind),
    org: p.org,
    // An unknown class falls back to the plain network class.
    provider: PROVIDERS.includes(p.provider as ProviderClass) ? p.provider : 'network',
    payloadClass: opt(p.payload_class),
    // Only DNP3 sets this, and only to those two values (ics_severity.rs).
    icsSeverity: ics === 'critical' || ics === 'high' ? ics : undefined,
    communityId: opt(row.record.network?.community_id ?? ''),
  }
}