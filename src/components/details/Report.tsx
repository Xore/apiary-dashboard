import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import type { ReportDefinition, ReportsData } from '#/data/types'

export const WINDOWS = [
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function describeSchedule(
  schedule: ReportDefinition['schedule'],
): string {
  if (!schedule) return 'on demand'
  const at = `${pad2(schedule.hour)}:${pad2(schedule.minute)} UTC`
  if (schedule.frequency === 'weekly')
    return `weekly on ${WEEKDAYS[schedule.weekday]} at ${at}`
  if (schedule.frequency === 'monthly')
    return `monthly on day ${schedule.monthDay} at ${at}`
  return `daily at ${at}`
}

/** Everything a definition will produce, in one list. */
export function ReviewStep({
  draft,
  data,
}: {
  draft: ReportDefinition
  data: ReportsData
}) {
  const template = data.templates.find((t) => t.id === draft.template)
  const scope = [
    draft.scope.ip && `IP ${draft.scope.ip}`,
    draft.scope.sensor && `sensor ${draft.scope.sensor}`,
    draft.scope.port && `port ${draft.scope.port}`,
    draft.scope.signature && `signature “${draft.scope.signature}”`,
  ].filter(Boolean)
  return (
    <MetadataList label={{ position: 'start', width: 136 }}>
      <MetadataListItem label="Name">
        {draft.name || '(unnamed)'}
      </MetadataListItem>
      <MetadataListItem label="Template">
        {template?.name ?? draft.template}
      </MetadataListItem>
      <MetadataListItem label="Sections">
        {draft.elements
          .map((id) => data.elements.find((e) => e.id === id)?.label ?? id)
          .join(', ') || 'none'}
      </MetadataListItem>
      <MetadataListItem label="Theme">{draft.theme}</MetadataListItem>
      <MetadataListItem label="Window">
        {WINDOWS.find((w) => w.value === draft.scope.window)?.label ??
          draft.scope.window}
      </MetadataListItem>
      <MetadataListItem label="Scope">
        {scope.length ? scope.join(', ') : 'all captured activity'}
      </MetadataListItem>
      <MetadataListItem label="Schedule">
        {describeSchedule(draft.schedule)}
      </MetadataListItem>
      <MetadataListItem label="Cover title">
        {draft.branding.title}
      </MetadataListItem>
      <MetadataListItem label="Classification">
        {draft.branding.classification}
      </MetadataListItem>
    </MetadataList>
  )
}

// ---- Library ---------------------------------------------------------------
