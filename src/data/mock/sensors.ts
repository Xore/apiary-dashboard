// Per-sensor readings: each sensor type reports the quantities it exists to
// produce and its own leaderboards, rather than the same five for every
// sensor. Derived from the sensor's events plus seeded detail.
import type { CountRow, HoneypotEvent, Sensor, SensorMeasure, SensorRequest } from '../types'
import { createRng, int, pick } from './random'

function countBy(values: Array<string | undefined>, limit = 8): CountRow[] {
  const counts = new Map<string, number>()
  for (const v of values) if (v !== undefined) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ id: label, label, count }))
}

const of = (events: HoneypotEvent[], type: HoneypotEvent['type']) => events.filter((e) => e.type === type)

const DETECTIONS = ['lfi', 'sqli', 'rfi', 'xss', 'cmd_exec', 'index']
const AGENTS = ['Mozilla/5.0 zgrab/0.x', 'python-requests/2.31', 'curl/8.4.0', 'Go-http-client/1.1', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120']

export function sensorReading(sensor: Sensor, events: HoneypotEvent[]): {
  measures: SensorMeasure[]
  topLists: Array<{ label: string; rows: CountRow[] }>
  requests?: SensorRequest[]
} {
  const rng = createRng(sensor.id.length * 131 + events.length)
  switch (sensor.kind) {
    case 'Cowrie':
      return {
        measures: [
          { label: 'login attempts', value: of(events, 'login.failed').length + of(events, 'login.success').length, peak: `${int(rng, 30, 90)} in one session` },
          { label: 'successful logins', value: of(events, 'login.success').length, peak: 'root / 123456' },
          { label: 'commands run', value: of(events, 'command.input').length, peak: `${int(rng, 8, 40)} in one session` },
          { label: 'files downloaded', value: of(events, 'file.download').length, peak: `${int(rng, 1, 4)} in one session` },
        ],
        topLists: [
          { label: 'usernames', rows: countBy(events.map((e) => e.username)) },
          { label: 'passwords', rows: countBy(events.map((e) => e.password)) },
          { label: 'commands', rows: countBy(events.map((e) => e.command)) },
        ],
      }
    case 'Dionaea':
      return {
        measures: [
          { label: 'SMB sessions', value: events.filter((e) => e.protocol === 'smb').length, peak: `${int(rng, 3, 12)} per source` },
          { label: 'MySQL logins', value: events.filter((e) => e.protocol === 'mysql').length, peak: 'sa / (empty)' },
          { label: 'SIP probes', value: events.filter((e) => e.protocol === 'sip').length, peak: 'OPTIONS sip:100@' },
          { label: 'binaries captured', value: of(events, 'file.download').length, peak: `${int(rng, 40, 900)} KB largest` },
        ],
        topLists: [
          { label: 'services', rows: countBy(events.map((e) => e.protocol)) },
          { label: 'ports', rows: countBy(events.map((e) => String(e.dstPort))) },
          { label: 'IDS alerts', rows: countBy(of(events, 'ids.alert').map((e) => e.summary)) },
        ],
      }
    case 'Snare/Tanner': {
      const requests: SensorRequest[] = of(events, 'http.request').slice(0, 25).map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        srcIp: e.srcIp,
        method: e.summary.split(' ')[0],
        path: e.summary.split(' ')[1] ?? '/',
        detection: e.summary.includes('phpunit') ? 'rfi' : e.summary.includes('.env') ? 'lfi' : pick(rng, DETECTIONS),
        userAgent: pick(rng, AGENTS),
      }))
      return {
        measures: [
          { label: 'requests', value: of(events, 'http.request').length, peak: `${int(rng, 20, 80)} from one source` },
          { label: 'attacks detected', value: requests.filter((r) => r.detection !== 'index').length, peak: 'rfi' },
          { label: 'distinct paths', value: new Set(requests.map((r) => r.path)).size, peak: '/wp-login.php' },
        ],
        topLists: [
          { label: 'paths', rows: countBy(requests.map((r) => r.path)) },
          { label: 'detections', rows: countBy(requests.map((r) => r.detection)) },
          { label: 'user agents', rows: countBy(requests.map((r) => r.userAgent)) },
        ],
        requests,
      }
    }
    case 'RDPY':
      return {
        measures: [
          { label: 'RDP connections', value: events.length, peak: `${int(rng, 5, 20)} per source` },
          { label: 'credential attempts', value: Math.round(events.length * 0.6), peak: 'administrator' },
        ],
        topLists: [
          { label: 'RDP cookie usernames', rows: countBy(events.map(() => pick(rng, ['administrator', 'admin', 'user', 'hello', 'test']))) },
          { label: 'client builds', rows: countBy(events.map(() => pick(rng, ['2600', '7601', '9600', '19041']))) },
        ],
      }
    default:
      return {
        measures: [
          { label: 'alerts', value: of(events, 'ids.alert').length, peak: 'ET SCAN' },
          { label: 'flows inspected', value: events.length * 37, peak: `${int(rng, 200, 900)} flows/min` },
        ],
        topLists: [
          { label: 'signatures', rows: countBy(of(events, 'ids.alert').map((e) => e.summary)) },
          { label: 'ports', rows: countBy(events.map((e) => String(e.dstPort))) },
        ],
      }
  }
}
