// The files the dashboard hands over, at the paths production serves them
// from (/api/export, /api/payload, /api/recording, /api/report,
// /api/raw-report, /api/artifact, /api/canarytoken). Each is built from the
// same data seam the pages read, through the mock scenario named in `?mock=`,
// so an outage, an empty backend or the viewer role reach the downloads too.
//
// A captured payload is live malware in production; here it is a small text
// file saying so. Nothing that downloads from the mock is executable.
import { asApiError } from './errors'
import {
  getArtifactFile,
  getCanarytokens,
  getCapeRun,
  getCommands,
  getEvents,
  getGithubAnalysis,
  getInfraClusters,
  getNetworkCampaigns,
  getPayloadAnalysis,
  getReplay,
  getReports,
  getSessionUser,
  getShellConfig,
  getSourceProfiles,
  previewReport,
  searchHistory,
} from './queries'
import { isScenario, setMockScenario } from './scenario'
import type { EventFilters, ReportDefinition } from './types'
import { toCsv } from '#/lib/export'
import { formatNumber } from '#/lib/format'
import { buildPdf } from '#/lib/pdf'
import type { PdfLine } from '#/lib/pdf'

const HASH = /^[0-9a-fA-F]{32,64}$/

type Body = string | Uint8Array

function file(body: Body, type: string, filename: string, disposition: 'attachment' | 'inline' = 'attachment'): Response {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body
  return new Response(bytes as BodyInit, {
    headers: {
      'content-type': type,
      'content-disposition': `${disposition}; filename="${filename.replace(/["\\\r\n]/g, '_')}"`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    },
  })
}

const text = (status: number, message: string) => new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })

/** Runs one download under the scenario the link carries; a failed backend
 * call answers with its own status, as the proxy in front of it would. */
export async function serveDownload(request: Request, build: (search: URLSearchParams) => Promise<Response>): Promise<Response> {
  const search = new URL(request.url).searchParams
  const mock = search.get('mock')
  setMockScenario(isScenario(mock) ? mock : undefined)
  try {
    return await build(search)
  } catch (error) {
    const api = asApiError(error)
    if (api) return text(api.status, `${api.endpoint}: ${api.kind}`)
    throw error
  }
}

// ---- Exports ---------------------------------------------------------------

const EVENT_FILTERS = ['ip', 'sensor', 'country', 'proto', 'port', 'persona', 'site', 'asset', 'org', 'provider', 'city', 'fingerprint', 'kind', 'since'] as const

async function cap<T>(rows: T[]): Promise<T[]> {
  const { behavior } = await getShellConfig()
  return rows.slice(0, behavior.maxExportRows)
}

const EXPORTS: Partial<Record<string, (search: URLSearchParams) => Promise<Response>>> = {
  'events.csv': async (search) => {
    const filters: EventFilters = {}
    for (const key of EVENT_FILTERS) {
      const value = search.get(key)
      if (value) filters[key] = value
    }
    const { rows } = await getEvents(filters)
    return file(toCsv(await cap(rows), ['timestamp', 'sensor', 'persona', 'asset', 'srcIp', 'country', 'city', 'org', 'provider', 'protocol', 'dstPort', 'type', 'severity', 'summary', 'fingerprint', 'communityId', 'sessionId']), 'text/csv', 'events.csv')
  },
  'commands.csv': async () => file(toCsv(await cap(await getCommands()), ['timestamp', 'sensor', 'srcIp', 'command', 'sessionId']), 'text/csv', 'commands.csv'),
  'ips.csv': async () => file(toCsv(await cap((await getSourceProfiles()).sources), ['ip', 'country', 'org', 'events', 'logins', 'sessions', 'sensors', 'first', 'last']), 'text/csv', 'ips.csv'),
  'campaigns.csv': async () => file(toCsv(await cap((await getNetworkCampaigns()).campaigns), ['cidr', 'score', 'events', 'uniqueIps', 'sensors', 'ports', 'creds', 'payloads', 'alerts', 'first', 'last']), 'text/csv', 'campaigns.csv'),
  'clusters.csv': async () => file(toCsv(await cap(await getInfraClusters()), ['kind', 'value', 'sources', 'events', 'sensors']), 'text/csv', 'clusters.csv'),
  'history.json': async (search) => file(`${JSON.stringify(await cap(await searchHistory(search.get('q') ?? '')), null, 2)}\n`, 'application/json', 'history.json'),
}

export const exportFile = (name: string) => (search: URLSearchParams) => EXPORTS[name]?.(search) ?? Promise.resolve(text(404, 'unknown export'))

// ---- Payloads, recordings --------------------------------------------------

export const payloadFile = (hash: string) => async () => {
  const user = await getSessionUser()
  if (!user.roles.includes('admin')) return text(403, 'administrator role required')
  if (!HASH.test(hash)) return text(400, 'invalid payload id')
  const analysis = await getPayloadAnalysis(hash)
  if (!analysis) return text(404, 'payload unavailable')
  const note = [
    'APIARY mock payload',
    `sha256: ${analysis.payload.hash}`,
    `type:   ${analysis.fileType}`,
    '',
    'This file stands in for the captured sample. In production this download',
    'is the raw bytes as captured: live malware, served as application/octet-stream,',
    'and only to administrators.',
    '',
  ].join('\n')
  return file(note, 'application/octet-stream', `${analysis.payload.hash}.bin`)
}

export const recordingFile = (shasum: string, format: string) => async () => {
  if (!HASH.test(shasum)) return text(400, 'invalid recording id')
  if (format !== 'cast' && format !== 'raw') return text(404, 'unknown recording format')
  const replay = await getReplay(shasum)
  if (!replay) return text(404, 'recording unavailable')
  if (format === 'raw') return file(replay.transcript, 'application/octet-stream', `${shasum}.raw`)
  // asciicast v2: a header line, then one [time, "o", text] line per write.
  const lines = replay.transcript.split('\n')
  const step = replay.durationSeconds / Math.max(1, lines.length)
  const cast = [
    JSON.stringify({ version: 2, width: 120, height: 32, title: `APIARY recording ${shasum.slice(0, 12)}` }),
    ...lines.map((line, i) => JSON.stringify([Number((i * step).toFixed(3)), 'o', `${line}\r\n`])),
  ].join('\n')
  return file(`${cast}\n`, 'application/x-asciicast+json', `${shasum}.cast`)
}

// ---- Reports ---------------------------------------------------------------

export const reportPdf = (id: string) => async () => {
  const data = await getReports()
  const report = data.generated.find((g) => g.id === id)
  if (!report) return text(404, 'report unavailable')
  const template = data.templates.find((t) => t.id === report.template)
  const saved = data.definitions.find((d) => d.id === report.definitionId)
  // A one-off report kept no definition: it covered its template's sections.
  const definition: ReportDefinition = saved ?? {
    id: report.id,
    name: report.title,
    template: report.template,
    theme: 'light',
    elements: template?.elements ?? [],
    scope: { window: '24h', ip: [], sensor: [], port: [], signature: [] },
    branding: { title: report.title, author: 'APIARY', headerLeft: '', headerRight: '', footerLeft: '', classification: 'TLP:AMBER' },
    schedule: null,
    created: report.createdAt,
  }
  const preview = await previewReport(definition)
  const lines: PdfLine[] = [
    { text: definition.branding.classification, size: 9, bold: true },
    { text: report.title, size: 22, bold: true, gap: 8 },
    { text: `${template?.name ?? report.template} - generated ${report.createdAt.slice(0, 16).replace('T', ' ')} UTC`, size: 10 },
    { text: `Covers ${preview.period.from.slice(0, 10)} to ${preview.period.to.slice(0, 10)}`, size: 10 },
    { text: `${formatNumber(preview.events)} events from ${formatNumber(preview.sources)} sources on ${formatNumber(preview.sensors)} sensors, ${formatNumber(preview.sessions)} sessions`, size: 11, gap: 10 },
  ]
  for (const section of preview.sections) {
    lines.push({ text: section.label, size: 14, bold: true, gap: 12 })
    lines.push({ text: `${section.columns[0]}  |  ${section.columns[1]}`, size: 9, bold: true })
    for (const [a, b] of section.sample) lines.push({ text: `${a}  |  ${b}`, size: 9 })
    if (section.rows > section.sample.length) lines.push({ text: `... and ${section.rows - section.sample.length} more rows`, size: 9 })
  }
  lines.push({ text: 'Mock document: the real report renders every row, with charts, in the chosen theme.', size: 8, gap: 16 })
  return file(buildPdf(lines, report.title), 'application/pdf', `${report.title}.pdf`, 'inline')
}

export const rawReport = (kind: string, sha: string) => async () => {
  const report = kind === 'cape' ? await getCapeRun(sha) : kind === 'github-analysis' ? await getGithubAnalysis(sha) : undefined
  if (report === undefined) return text(404, 'unknown report kind')
  if (!report) return text(404, 'raw report unavailable')
  return file(`${JSON.stringify(report, null, 2)}\n`, 'application/json', `${kind}-${sha}.json`)
}

// ---- Artifacts, canarytokens -----------------------------------------------

export const artifactFile = (kind: string, key: string, filename: string) => async () => {
  const artifact = await getArtifactFile(kind, key, filename)
  if (!artifact) return text(404, 'artifact unavailable')
  return file(artifact.body, artifact.contentType, artifact.filename)
}

const CANARY_FILES: Record<string, (memo: string, url: string, hostname: string) => { body: Body; type: string; extension: string }> = {
  aws_keys: (memo, _url, hostname) => ({
    body: `# ${memo}\n[default]\naws_access_key_id = AKIA${hostname.replace(/[^A-Z0-9]/gi, '').slice(0, 16).toUpperCase().padEnd(16, 'X')}\naws_secret_access_key = mock/${hostname.slice(0, 32)}\nregion = us-east-2\n`,
    type: 'text/plain',
    extension: 'credentials',
  }),
  kubeconfig: (memo, url) => ({
    body: `# ${memo}\napiVersion: v1\nkind: Config\nclusters:\n- name: prod\n  cluster:\n    server: ${url}\ncontexts:\n- name: prod\n  context: { cluster: prod, user: deploy }\ncurrent-context: prod\nusers:\n- name: deploy\n  user: { token: mock-canary-token }\n`,
    type: 'application/yaml',
    extension: 'kubeconfig',
  }),
  ms_word: (memo, url) => ({
    // An RTF opens in Word the way the real .docx does; the beacon is a field.
    body: `{\\rtf1\\ansi{\\fonttbl{\\f0 Calibri;}}\\f0\\fs24 ${memo}\\par{\\field{\\*\\fldinst INCLUDEPICTURE "${url}" \\\\d}}\\par}\n`,
    type: 'application/rtf',
    extension: 'rtf',
  }),
  pdf: (memo, url) => ({ body: buildPdf([{ text: memo, size: 16, bold: true }, { text: `Canarytoken document: opening it calls ${url}.`, size: 10 }], memo), type: 'application/pdf', extension: 'pdf' }),
}

export const canarytokenFile = (id: string) => async () => {
  const token = (await getCanarytokens()).tokens.find((t) => t.id === id)
  const build = token?.artifact ? CANARY_FILES[token.type] : undefined
  if (!token?.artifact || !build) return text(404, 'artifact unavailable')
  const made = build(token.memo, token.url, token.hostname)
  return file(made.body, made.type, `${token.artifact}.${made.extension}`)
}
