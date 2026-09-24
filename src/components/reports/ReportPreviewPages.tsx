/**
 * A quick look at the document before it is generated: the cover and the
 * first page of every section, drawn as A4 pages in the report's own theme
 * with its header, footer and classification marking. Section pages carry
 * the rows the scope actually matched, so a wrong filter or a missing section
 * shows here, not in the PDF.
 */
import { Theme } from '@astryxdesign/core/theme'
import { Text } from '@astryxdesign/core/Text'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Icon } from '@astryxdesign/core/Icon'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { ReportDefinition, ReportPreview } from '#/data/types'
import { formatDateTime } from '#/lib/format'
import { neutralTheme } from '#/themes/neutral/neutral'

const PAGE_WIDTH = 300
const PAGE_GAP = 12

/** Traffic Light Protocol marking colours. */
function markingColor(classification: string) {
  if (classification.includes('RED')) return 'var(--color-text-red)'
  if (classification.includes('AMBER')) return 'var(--color-text-orange)'
  if (classification.includes('GREEN')) return 'var(--color-text-green)'
  return 'var(--color-text-secondary)'
}

type PageProps = { draft: ReportDefinition; number: number; total: number; children: ReactNode }

function Page({ draft, number, total, children }: PageProps) {
  const { branding } = draft
  const marking = (
    <div style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: markingColor(branding.classification) }}>{branding.classification}</div>
  )
  const edge = (left: string, right: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 8, color: 'var(--color-text-secondary)' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{left}</span>
      <span style={{ flexShrink: 0 }}>{right}</span>
    </div>
  )
  return (
    <div
      role="img"
      aria-label={`Page ${number} of ${total}`}
      style={{
        width: `min(${PAGE_WIDTH}px, 100%)`,
        aspectRatio: `1 / ${Math.SQRT2}`,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 16px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: 4,
        border: '1px solid var(--color-border-emphasized)',
        backgroundColor: 'var(--color-background-card)',
        color: 'var(--color-text-primary)',
      }}
    >
      {marking}
      {edge(branding.headerLeft, branding.headerRight)}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>{children}</div>
      {edge(branding.footerLeft, `${number} / ${total}`)}
      {marking}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 8, fontSize: 9 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}

export function ReportPreviewPages({ draft, preview, templateName }: { draft: ReportDefinition; preview: ReportPreview; templateName: string }) {
  const total = preview.pages
  const { scope } = draft
  const filters = [
    scope.ip.length ? `Sources ${scope.ip.join(', ')}` : '',
    scope.sensor.length ? `Sensors ${scope.sensor.join(', ')}` : '',
    scope.port.length ? `Ports ${scope.port.join(', ')}` : '',
    scope.signature.length ? `Signatures ${scope.signature.join(', ')}` : '',
  ].filter(Boolean)
  // Each section starts on the page after the previous one ends.
  let next = 2
  const starts = preview.sections.map((s) => {
    const start = next
    next += s.pages
    return start
  })

  const strip = useRef<HTMLDivElement>(null)
  const turn = (direction: 1 | -1) => {
    const page = strip.current?.firstElementChild as HTMLElement | null | undefined
    strip.current?.scrollBy({ left: direction * ((page?.offsetWidth ?? PAGE_WIDTH) + PAGE_GAP), behavior: 'smooth' })
  }

  return (
    // Zero intrinsic width: the strip scrolls inside the column instead of widening it.
    <VStack gap={2} style={{ width: 0, minWidth: '100%' }}>
      <Theme theme={neutralTheme} mode={draft.theme}>
        <div
          ref={strip}
          aria-label="Report preview"
          style={{ display: 'flex', gap: PAGE_GAP, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: 12, borderRadius: 8, backgroundColor: 'var(--color-background-muted)' }}
        >
          <Page draft={draft} number={1} total={total}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
              <div style={{ fontSize: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{templateName}</div>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{draft.branding.title || 'Untitled report'}</div>
              {draft.branding.author && <div style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>{draft.branding.author}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 8, borderTop: '1px solid var(--color-border-emphasized)' }}>
              <Fact label="Period" value={`${formatDateTime(preview.period.from)} – ${formatDateTime(preview.period.to)}`} />
              <Fact label="Scope" value={filters.length ? filters.join(' · ') : 'Every sensor and source'} />
              <Fact label="Covers" value={`${preview.events.toLocaleString('en-US')} events · ${preview.sources.toLocaleString('en-US')} sources`} />
              <Fact label="Contents" value={preview.sections.map((s, i) => `${s.label} p.${starts[i]}`).join(', ') || 'No sections'} />
            </div>
          </Page>
          {preview.sections.map((section, i) => (
            <Page key={section.id} draft={draft} number={starts[i]} total={total}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{section.label}</div>
              {section.sample.length === 0 ? (
                <div style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>Nothing in scope for this section. It prints as an empty page.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ color: 'var(--color-text-secondary)', textAlign: 'left' }}>
                      <th style={{ fontWeight: 600, paddingBottom: 4 }}>{section.columns[0]}</th>
                      <th style={{ fontWeight: 600, paddingBottom: 4, textAlign: 'right', width: 64 }}>{section.columns[1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.sample.map(([key, value]) => (
                      <tr key={key} style={{ borderTop: '1px solid var(--color-border-emphasized)' }}>
                        <td style={{ padding: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: section.id === 'summary' ? undefined : 'var(--font-family-code, monospace)' }} title={key}>
                          {key}
                        </td>
                        <td style={{ padding: '3px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {section.rows > section.sample.length && (
                <div style={{ fontSize: 8, color: 'var(--color-text-secondary)' }}>
                  {`+ ${(section.rows - section.sample.length).toLocaleString('en-US')} more rows${section.pages > 1 ? ` over ${section.pages} pages` : ''}`}
                </div>
              )}
            </Page>
          ))}
        </div>
      </Theme>
      <HStack gap={1} vAlign="center">
        <StackItem size="fill">
          <Text type="supporting" color="secondary">
            {`Cover and the first page of each section, in the ${draft.theme} theme. ${total} ${total === 1 ? 'page' : 'pages'} in all.`}
          </Text>
        </StackItem>
        <IconButton label="Previous page" variant="ghost" size="sm" icon={<Icon icon={ChevronLeftIcon} size="sm" />} onClick={() => turn(-1)} />
        <IconButton label="Next page" variant="ghost" size="sm" icon={<Icon icon={ChevronRightIcon} size="sm" />} onClick={() => turn(1)} />
      </HStack>
    </VStack>
  )
}
