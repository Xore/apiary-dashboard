// Backend event row → the page's HoneypotEvent. Pure; nothing calls the
// backend yet. Wire shape: ../contracts/events.ts, which is shared with
// #75 and with every slice that lists events.
//
// "": on a row means absent — the backend builds each pivot with
// unwrap_or("") — so it maps to an omitted optional field, never to "".

import type { EventRow } from '../contracts/events'
import type { HoneypotEvent, ProviderClass } from '../types'

/** HoneypotEvent fields the event row never sets, and why:
 *
 * - `type` — the row has no event kind of its own; `detail` is the sensor's
 *   rendered sentence, not a classification. The seam derives it from the
 *   event name (`pageEvent`).
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
 *
 * `severity` is not in this list: it is set when `pivots.ics_severity` says
 * so, and omitted otherwise. Nothing on the wire classifies a generic row.
 */
export type EventRowGap = 'type' | 'eventName' | 'srcPort' | 'techniques' | 'city' | 'organization'

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
    country: opt(row.country),
    asn: opt(p.asn),
    sessionId: opt(row.session),
    username: opt(p.user),
    password: opt(p.pass),
    command: opt(p.command),
    summary: opt(row.detail),
    // The sensor's own object, passed through as written (credentials
    // already replaced with [redacted] for the two decoys the backend
    // scrubs — see EsRecord).
    fields: row.record.honeypot ?? {},
    persona: opt(p.persona),
    site: opt(p.site),
    asset: opt(p.asset),
    fingerprint: opt(p.fingerprint),
    fingerprintKind: opt(p.fingerprint_kind),
    org: opt(p.org),
    // A class the page does not know stays absent rather than being
    // rounded to `network`: that would claim a classification the row lacks.
    provider: PROVIDERS.includes(p.provider as ProviderClass) ? p.provider : undefined,
    payloadClass: opt(p.payload_class),
    // Only DNP3 sets this, and only to those two values (ics_severity.rs).
    icsSeverity: ics === 'critical' || ics === 'high' ? ics : undefined,
    // The same two values, read as the row's severity. Absent on every
    // other row: an unclassified event has no severity, not `info`.
    severity: ics === 'critical' || ics === 'high' ? ics : undefined,
    communityId: opt(row.record.network?.community_id ?? ''),
  }
}