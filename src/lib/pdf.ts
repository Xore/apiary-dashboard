// A minimal PDF writer for the mock downloads: pages of left-aligned lines in
// Helvetica, A4. Enough for a real file a viewer opens, nothing more.

export type PdfLine = { text: string; size?: number; bold?: boolean; gap?: number }

const PAGE = { width: 595, height: 842, margin: 56 }

/** PDF strings in the standard fonts: ASCII, with ( ) \ escaped. */
function pdfText(text: string): string {
  const ascii = text
    .replace(/[–—]/g, '-')
    .replace(/[·•]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7e]/g, '?')
  return ascii.replace(/[\\()]/g, (c) => `\\${c}`)
}

/** Lines that do not fit a page start the next one. */
function paginate(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [[]]
  let y = PAGE.height - PAGE.margin
  for (const line of lines) {
    const step = (line.size ?? 10) * 1.45 + (line.gap ?? 0)
    if (y - step < PAGE.margin && pages[pages.length - 1].length > 0) {
      pages.push([])
      y = PAGE.height - PAGE.margin
    }
    pages[pages.length - 1].push(line)
    y -= step
  }
  return pages
}

function contentStream(lines: PdfLine[]): string {
  let y = PAGE.height - PAGE.margin
  const ops: string[] = []
  for (const line of lines) {
    const size = line.size ?? 10
    y -= size * 1.45 + (line.gap ?? 0)
    ops.push(`BT /${line.bold ? 'F2' : 'F1'} ${size} Tf ${PAGE.margin} ${y.toFixed(1)} Td (${pdfText(line.text)}) Tj ET`)
  }
  return ops.join('\n')
}

export function buildPdf(lines: PdfLine[], title: string): Uint8Array {
  const pages = paginate(lines)
  const objects: string[] = []
  const pageIds = pages.map((_, i) => 5 + i * 2)
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  pages.forEach((page, i) => {
    const stream = contentStream(page)
    objects[pageIds[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`
    objects[pageIds[i] + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  const info = objects.length
  objects[info] = `<< /Title (${pdfText(title)}) /Producer (APIARY mock) >>`

  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = out.length
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(out)
}
