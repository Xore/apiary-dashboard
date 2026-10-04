// Reports slice adapters: one realistic wire fixture per endpoint, mapped to
// the page types the reports page already renders.
import { describe, expect, it } from 'vitest'
import type { GeneratedReportWire, ReportDefinitionWire } from '../contracts/reports'
import {
  generateReportResult,
  generatedReportPage,
  reportDefinitionBody,
  reportDefinitions,
  reportTemplates,
  savedReportDefinition,
} from './reports'

const definition: ReportDefinitionWire = {
  id: 'rd_7f3a',
  name: 'Weekly SSH brief',
  template: 'executive',
  theme: 'light',
  branding: { title: 'SSH activity', author: 'SOC', classification: 'TLP:AMBER' },
  scope: { window: '7d', sensor: 'cowrie', network: '203.0.113.0/24' },
  elements: ['summary', 'top_sources'],
  appendix_limit: 50,
  schedule: { enabled: true, frequency: 'weekly', hour: 6, minute: 30, weekday: 1, month_day: 1, next_run_at: '2026-10-05T06:30:00Z', failures: 0 },
  created: '2026-09-01T10:00:00Z',
  updated: '2026-09-20T10:00:00Z',
}

const meta: GeneratedReportWire = {
  id: 'gr_19c2',
  definition_id: 'rd_7f3a',
  name: 'Weekly SSH brief',
  template: 'executive',
  theme: 'light',
  title: 'SSH activity',
  size_bytes: 184_320,
  created_at: '2026-09-28T06:30:04Z',
  origin: 'schedule',
}

describe('reports adapters', () => {
  it('maps GET /reports/templates', () => {
    const out = reportTemplates({
      templates: [{ id: 'executive', name: 'Executive', description: 'One-page brief', title: 'Executive brief', theme: 'dark', window: '7d', elements: ['summary'], sandbox: false, payload: false, ghidra: false }],
      elements: [{ id: 'summary', label: 'Summary', description: 'Headline numbers' }],
    })
    expect(out).toEqual({
      templates: [{ id: 'executive', name: 'Executive', description: 'One-page brief', elements: ['summary'] }],
      elements: [{ id: 'summary', label: 'Summary', description: 'Headline numbers' }],
    })
  })

  it('maps GET /reports/definitions', () => {
    const [def] = reportDefinitions({ definitions: [definition] })
    expect(def).toEqual({
      id: 'rd_7f3a',
      name: 'Weekly SSH brief',
      template: 'executive',
      theme: 'light',
      elements: ['summary', 'top_sources'],
      scope: { window: '7d', ip: [], sensor: ['cowrie'], port: [], signature: [] },
      branding: { title: 'SSH activity', author: 'SOC', headerLeft: '', headerRight: '', footerLeft: '', classification: 'TLP:AMBER' },
      schedule: { frequency: 'weekly', hour: 6, minute: 30, weekday: 1, monthDay: 1, nextRunAt: '2026-10-05T06:30:00Z' },
      appendixLimit: 50,
      created: '2026-09-01T10:00:00Z',
    })
  })

  it('maps the POST/PUT envelope, a disabled schedule reading as none', () => {
    const def = savedReportDefinition({ definition: { ...definition, schedule: { ...definition.schedule!, enabled: false } } })
    expect(def.schedule).toBeNull()
  })

  it('builds the POST/PUT body from a page definition, keeping the first scope value', () => {
    const page = reportDefinitions({ definitions: [definition] })[0]
    const body = reportDefinitionBody({ ...page, scope: { ...page.scope, ip: ['198.51.100.4', '198.51.100.5'] } })
    expect(body.scope).toEqual({ window: '7d', ip: '198.51.100.4', sensor: 'cowrie', port: '', signature: '' })
    expect(body.schedule).toEqual({ enabled: true, frequency: 'weekly', hour: 6, minute: 30, weekday: 1, month_day: 1 })
    expect(body.branding.header_left).toBe('')
  })

  it('maps GET /store/generated-reports', () => {
    const page = generatedReportPage({ total: 1, rows: [{ ...meta, _doc_id: meta.id }] })
    expect(page).toEqual({
      total: 1,
      reports: [{ id: 'gr_19c2', title: 'SSH activity', template: 'executive', origin: 'schedule', createdAt: '2026-09-28T06:30:04Z', sizeBytes: 184_320, definitionId: 'rd_7f3a' }],
    })
  })

  it('maps POST /reports/definitions/{id}/generate', () => {
    const { definition_id: _, ...adhoc } = meta
    expect(generateReportResult({ generated: { ...adhoc, title: '', origin: 'manual' } })).toMatchObject({ title: 'Weekly SSH brief', origin: 'manual', definitionId: '' })
  })
})
