import { describe, expect, it } from 'vitest'
import { buildPdf } from './pdf'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('buildPdf', () => {
  it('writes a PDF whose cross-reference table points at its objects', () => {
    const pdf = text(buildPdf([{ text: 'Daily threat report', size: 20, bold: true }, { text: 'Events (24h) — 1,204 · (capped)' }], 'Daily'))
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    const startxref = Number(/startxref\n(\d+)/.exec(pdf)![1])
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref')
    const offsets = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
    offsets.forEach((offset, i) => expect(pdf.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true))
    expect(pdf).toContain('(Events \\(24h\\) - 1,204 - \\(capped\\)) Tj')
  })

  it('starts a new page when the lines run out', () => {
    const pdf = text(buildPdf(Array.from({ length: 120 }, (_, i) => ({ text: `row ${i}` })), 'Long'))
    expect(/\/Count (\d+)/.exec(pdf)![1]).toBe('3')
  })
})
