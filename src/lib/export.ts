// CSV for the served exports (/api/export/*), and the one client-side
// download: the event explorer's loaded rows as JSON, as production does.

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

/** Rows as CSV, one column per key, quoted where a value needs it. */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: Array<keyof T & string>): string {
  const lines = [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))]
  return `${lines.join('\n')}\n`
}

export function downloadJson(filename: string, value: unknown) {
  download(filename, 'application/json', JSON.stringify(value, null, 2))
}
