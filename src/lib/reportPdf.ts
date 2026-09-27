// Where a generated report's PDF is, and which sample a payload report is
// about (its id names it: `rpt-payload-<sha256>-<n>`).
import type { GeneratedReport } from '#/data/types'
import { apiHref } from '#/lib/apiHref'

export const reportPdfHref = (report: Pick<GeneratedReport, 'id'>): string => apiHref(`/api/report/${encodeURIComponent(report.id)}/pdf`)

export const payloadOfReport = (id: string) => /^rpt-payload-([0-9a-f]{64})-/.exec(id)?.[1]
