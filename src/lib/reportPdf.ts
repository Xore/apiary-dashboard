// Where a generated report's PDF is. The link also carries what the report
// is, so a report the server has not heard of (the mock keeps state per
// browser tab) still renders; production looks the id up and ignores it.
import type { GeneratedReport, ReportDefinition } from '#/data/types'
import { apiHref } from '#/lib/apiHref'

export type ReportSpec = Pick<GeneratedReport, 'title' | 'template' | 'createdAt'> & { definition?: ReportDefinition }

const toBase64Url = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

export function reportPdfHref(report: GeneratedReport, definition?: ReportDefinition): string {
  const spec: ReportSpec = { title: report.title, template: report.template, createdAt: report.createdAt, definition }
  return apiHref(`/api/report/${encodeURIComponent(report.id)}/pdf`, { spec: toBase64Url(JSON.stringify(spec)) })
}

/** Payload reports name their sample in the id: `rpt-payload-<sha256>-<n>`. */
export const payloadOfReport = (id: string) => /^rpt-payload-([0-9a-f]{64})-/.exec(id)?.[1]
