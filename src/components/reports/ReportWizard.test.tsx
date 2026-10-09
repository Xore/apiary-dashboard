// @vitest-environment jsdom
// The data check with no preview (the live tier, APIARY#3524): it runs only
// the checks that need no counts, and the preview draws the document's
// structure with no numbers in it.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '#/themes/neutral/neutral-family'
import type { ReportDefinition, ReportPreview } from '#/data/types'
import { ReportPreviewPages } from './ReportPreviewPages'
import { automaticChecks } from './ReportWizard'

afterEach(cleanup)

const ELEMENTS = [
  { id: 'summary', label: 'Summary', description: '' },
  { id: 'sources', label: 'Sources', description: '' },
]

const draft: ReportDefinition = {
  id: '',
  name: 'Weekly',
  template: 'weekly',
  theme: 'dark',
  elements: ['summary', 'sources'],
  scope: { window: '7d', ip: ['203.0.113.7'], sensor: [], port: [], signature: [] },
  branding: { title: 'Weekly briefing', author: '', headerLeft: 'APIARY', headerRight: '', footerLeft: '', classification: 'TLP:AMBER' },
  schedule: null,
  appendixLimit: 120,
  created: '',
}

const preview: ReportPreview = {
  events: 1234,
  sources: 56,
  sensors: 3,
  sessions: 78,
  sections: [
    { id: 'summary', label: 'Summary', rows: 6, pages: 1, columns: ['Measure', 'Value'], sample: [['Events', '1,234']] },
    { id: 'sources', label: 'Sources', rows: 56, pages: 2, columns: ['Source', 'Events'], sample: [['203.0.113.7', '99']] },
  ],
  pages: 4,
  period: { from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z' },
}

describe('automaticChecks', () => {
  it('runs the count-free checks when there is no preview', () => {
    const checks = automaticChecks(draft, null, ELEMENTS)
    const labels = checks[5].map((c) => c.label).join(' | ')
    expect(checks[5].map((c) => c.id)).toEqual(['scope', 'sections'])
    expect(labels).not.toMatch(/Counting|Filtering/)
    expect(checks[6].map((c) => c.label).join(' | ')).not.toMatch(/row/)
    expect(checks[6].map((c) => c.label)).toEqual(['Rendering summary', 'Rendering sources', expect.stringMatching(/^Assembling the dark PDF/)])
  })

  it('keeps the counted checks, including the empty-filter check, when there is a preview', () => {
    const checks = automaticChecks(draft, preview, ELEMENTS)
    expect(checks[5].map((c) => c.id)).toEqual(['window', 'ip', 'sections'])
    expect(checks[6][1].label).toBe('Rendering sources · 56 rows')
  })
})

describe('ReportPreviewPages without a preview', () => {
  it('draws the structure from the draft, with no counts and one note', () => {
    render(
      <Theme theme={neutralTheme}>
        <ReportPreviewPages draft={draft} preview={null} templateName="Weekly" elements={ELEMENTS} />
      </Theme>,
    )
    expect(screen.getByText('Weekly briefing')).toBeTruthy()
    expect(screen.getByText('Summary, Sources')).toBeTruthy()
    expect(screen.getAllByText('Row counts and samples appear in the generated report.')).toHaveLength(1)
    expect(document.body.textContent).not.toMatch(/\d+ (events|rows|pages?|sources|sessions)|p\.\d|1,234/i)
  })
})
