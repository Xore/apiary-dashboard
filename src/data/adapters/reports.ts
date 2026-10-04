// Wire → page mapping for the reports slice. Pure functions over the shapes
// in ../contracts/reports; nothing here fetches.
import type { GeneratedReport, ReportDefinition, ReportFrequency, ReportsData, ReportTemplate } from '../types'
import type {
  GenerateReportWire,
  GeneratedReportPageWire,
  GeneratedReportWire,
  ReportDefinitionEnvelopeWire,
  ReportDefinitionWire,
  ReportDefinitionsWire,
  ReportTemplatesWire,
} from '../contracts/reports'

const list = (value: string | undefined): string[] => (value ? [value] : [])

/** GET /api/v1/reports/templates. */
export function reportTemplates(wire: ReportTemplatesWire): Pick<ReportsData, 'templates' | 'elements'> {
  const templates: ReportTemplate[] = wire.templates.map((t) => ({ id: t.id, name: t.name, description: t.description, elements: t.elements }))
  return { templates, elements: wire.elements.map((e) => ({ id: e.id, label: e.label, description: e.description })) }
}

/** One definition. A disabled schedule reads as no schedule, as the page
 * has no separate on/off. Scope filters are single-valued on the wire. */
export function reportDefinition(wire: ReportDefinitionWire): ReportDefinition {
  const s = wire.schedule
  const b = wire.branding
  return {
    id: wire.id,
    name: wire.name,
    template: wire.template,
    theme: wire.theme === 'light' ? 'light' : 'dark',
    elements: wire.elements,
    scope: { window: wire.scope.window ?? '', ip: list(wire.scope.ip), sensor: list(wire.scope.sensor), port: list(wire.scope.port), signature: list(wire.scope.signature) },
    branding: {
      title: b.title ?? '',
      author: b.author ?? '',
      headerLeft: b.header_left ?? '',
      headerRight: b.header_right ?? '',
      footerLeft: b.footer_left ?? '',
      classification: b.classification ?? '',
    },
    schedule:
      s?.enabled && s.frequency
        ? {
            frequency: s.frequency as ReportFrequency,
            hour: s.hour,
            minute: s.minute,
            weekday: s.weekday,
            monthDay: s.month_day,
            ...(s.last_run_at ? { lastRunAt: s.last_run_at } : {}),
            ...(s.next_run_at ? { nextRunAt: s.next_run_at } : {}),
          }
        : null,
    appendixLimit: wire.appendix_limit,
    created: wire.created ?? '',
  }
}

/** GET /api/v1/reports/definitions. */
export const reportDefinitions = (wire: ReportDefinitionsWire): ReportDefinition[] => wire.definitions.map(reportDefinition)

/** POST / PUT /api/v1/reports/definitions[/{id}] response. */
export const savedReportDefinition = (wire: ReportDefinitionEnvelopeWire): ReportDefinition => reportDefinition(wire.definition)

/** Page → wire body for POST / PUT. Only the first value of each scope
 * filter survives (the wire holds one). */
export function reportDefinitionBody(def: ReportDefinition): ReportDefinitionWire {
  const b = def.branding
  return {
    id: def.id,
    name: def.name,
    template: def.template,
    theme: def.theme,
    branding: { title: b.title, author: b.author, header_left: b.headerLeft, header_right: b.headerRight, footer_left: b.footerLeft, classification: b.classification },
    scope: { window: def.scope.window, ip: def.scope.ip[0] ?? '', sensor: def.scope.sensor[0] ?? '', port: def.scope.port[0] ?? '', signature: def.scope.signature[0] ?? '' },
    elements: def.elements,
    appendix_limit: def.appendixLimit,
    ...(def.schedule
      ? { schedule: { enabled: true, frequency: def.schedule.frequency, hour: def.schedule.hour, minute: def.schedule.minute, weekday: def.schedule.weekday, month_day: def.schedule.monthDay } }
      : {}),
  }
}

export function generatedReport(wire: GeneratedReportWire): GeneratedReport {
  return {
    id: wire.id,
    title: wire.title || wire.name,
    template: wire.template,
    origin: wire.origin === 'schedule' ? 'schedule' : 'manual',
    createdAt: wire.created_at,
    sizeBytes: wire.size_bytes,
    definitionId: wire.definition_id ?? '',
  }
}

/** GET /api/v1/store/generated-reports. */
export function generatedReportPage(wire: GeneratedReportPageWire): { total: number; reports: GeneratedReport[] } {
  return { total: wire.total, reports: wire.rows.map(generatedReport) }
}

/** POST /api/v1/reports/definitions/{id}/generate. */
export const generateReportResult = (wire: GenerateReportWire): GeneratedReport => generatedReport(wire.generated)
