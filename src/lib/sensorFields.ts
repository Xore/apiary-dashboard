// Reading a sensor's own fields. Sensors disagree on field names (and
// several disagree with their own documentation), so a reference can name
// alternatives, and nested objects are read by dotted path.
import type { FieldValue, SensorFields } from '#/data/types'

/** Read a dotted path, trying each alternative name in order. */
export function readField(fields: SensorFields, ref: string | string[]): FieldValue | undefined {
  for (const name of Array.isArray(ref) ? ref : [ref]) {
    let value: FieldValue | undefined = fields
    for (const part of name.split('.')) {
      value = value !== null && typeof value === 'object' && !Array.isArray(value) ? value[part] : undefined
      if (value === undefined) break
    }
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

/** A field value as one line of text, never `[object Object]`. */
export function fieldText(value: FieldValue | undefined): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

/** A field value as a block: pretty JSON for structures, text otherwise. */
export function fieldBlock(value: FieldValue | undefined): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}
