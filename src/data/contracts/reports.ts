// The report-builder payloads the Rust tier serves (backend-service
// reports_api.rs, reports_store.rs, stores.rs), as they arrive on the wire.
// Empty strings are skipped on serialize (skip_serializing_if), so those
// fields are optional here.

/** One template in GET /api/v1/reports/templates. sandbox/payload/ghidra
 * say which artifact the template reports on (at most one is true). */
export interface ReportTemplateWire {
  id: string
  name: string
  description: string
  title: string
  theme: string
  window: string
  elements: string[]
  sandbox: boolean
  payload: boolean
  ghidra: boolean
}

export interface ReportElementWire {
  id: string
  label: string
  description: string
}

/** GET /api/v1/reports/templates. */
export interface ReportTemplatesWire {
  templates: ReportTemplateWire[]
  elements: ReportElementWire[]
}

export interface ReportBrandingWire {
  title?: string
  author?: string
  header_left?: string
  header_right?: string
  footer_left?: string
  classification?: string
}

/** Each filter is one value (the backend builds a single term query). */
export interface ReportScopeWire {
  window?: string
  ip?: string
  network?: string
  sensor?: string
  port?: string
  signature?: string
  country?: string
  asn?: string
  text?: string
  type?: string
  session?: string
  job?: string
  hash?: string
}

/** frequency is daily | weekly | monthly; weekday 0 (Sunday)..6; month_day
 * 1..28; hour/minute UTC. failures counts consecutive failed runs. */
export interface ReportScheduleWire {
  enabled: boolean
  frequency?: string
  hour: number
  minute: number
  weekday: number
  month_day: number
  last_run_at?: string
  next_run_at?: string
  failures?: number
}

/** ReportDefinition; also the POST and PUT /api/v1/reports/definitions body
 * (id, created, updated are server-owned). theme is dark | light. */
export interface ReportDefinitionWire {
  id: string
  name: string
  template: string
  theme: string
  branding: ReportBrandingWire
  scope: ReportScopeWire
  elements: string[]
  appendix_limit: number
  schedule?: ReportScheduleWire
  created?: string
  updated?: string
}

/** GET /api/v1/reports/definitions. */
export interface ReportDefinitionsWire {
  definitions: ReportDefinitionWire[]
}

/** POST (201) and PUT /api/v1/reports/definitions[/{id}]. */
export interface ReportDefinitionEnvelopeWire {
  definition: ReportDefinitionWire
}

/** DELETE /api/v1/reports/definitions/{id} and /reports/generated/{id}. */
export interface ReportDeletedWire {
  deleted: string
}

/** GeneratedReportMeta. origin is manual | schedule. */
export interface GeneratedReportWire {
  id: string
  definition_id?: string
  name: string
  template: string
  theme: string
  title: string
  size_bytes: number
  created_at: string
  origin: string
}

/** POST /api/v1/reports/definitions/{id}/generate body (origin defaults to
 * "manual"); the 201 response is GenerateReportWire. */
export interface GenerateReportBody {
  origin?: string
}

export interface GenerateReportWire {
  generated: GeneratedReportWire
}

/** GET /api/v1/store/generated-reports?offset&size (pdf_base64 excluded). */
export interface GeneratedReportPageWire {
  total: number
  rows: Array<GeneratedReportWire & { _doc_id: string }>
}

/** GET /api/v1/store/sandbox-runs?offset&size: raw sandbox-analysis-v1
 * `_source` docs. Only the keys the canonical sandbox-job picker reads are
 * typed (job id at sandbox.job or job, the sample hash, the risk level). */
export interface SandboxRunPageWire {
  total: number
  rows: Array<{
    _doc_id: string
    job?: string
    sandbox?: { job?: string }
    file?: { hash?: { sha256?: string } }
    risk_level?: string
  }>
}

/** GET /api/v1/payloads?offset&size&q: raw payload-inventory `_source`
 * docs. Only the keys the canonical payload picker reads are typed. The
 * source_* aggregation fields appear only with aggs=sources. */
export interface PayloadSearchPageWire {
  total: number
  rows: Array<{ _doc_id: string; Hash?: string; Kind?: string; SizeH?: string; Sources?: string[] }>
  source_buckets?: Array<{ key: string; doc_count: number }>
  source_other?: number
}
