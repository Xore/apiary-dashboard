// Client-side downloads of rows already on screen. The canonical app streams
// these from /api/export/*; with mock data the rows in hand are the data set.

function download(filename: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join(' ') : value === undefined || value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function downloadCsv<T extends Record<string, unknown>>(filename: string, rows: T[], columns: Array<keyof T & string>) {
  const lines = [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))]
  download(filename, 'text/csv', `${lines.join('\n')}\n`)
}

export function downloadJson(filename: string, value: unknown) {
  download(filename, 'application/json', JSON.stringify(value, null, 2))
}
