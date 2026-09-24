import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Grid } from '@astryxdesign/core/Grid'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { SelectableCard } from '@astryxdesign/core/SelectableCard'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Switch } from '@astryxdesign/core/Switch'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { useViewTabs } from '#/components/ViewTabs'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { PageFrame } from '#/components/PageFrame'
import { deleteGeneratedReport, deleteReportDefinition, generateReport, getReports, saveReportDefinition } from '#/data/queries'
import type { GeneratedReport, ReportDefinition, ReportFrequency, ReportsData } from '#/data/types'
import { formatDateTime } from '#/lib/format'
import { Link } from '@astryxdesign/core/Link'
import { ReviewStep, WEEKDAYS, WINDOWS, describeSchedule } from '#/components/details/Report'

const STEPS = [
  { id: 'design', label: 'Design', lede: 'What kind of report this is, and which sections it contains.' },
  { id: 'scope', label: 'Scope', lede: 'Which captured activity the report covers.' },
  { id: 'schedule', label: 'Schedule', lede: 'Whether it runs on its own, and how often.' },
  { id: 'branding', label: 'Branding', lede: 'What appears on every page of the PDF.' },
  { id: 'review', label: 'Review', lede: 'Everything chosen so far. Nothing has been generated yet.' },
  { id: 'library', label: 'Library', lede: 'Saved definitions and the PDFs they have produced.' },
] as const
type Step = (typeof STEPS)[number]['id']
const BUILD_STEPS = STEPS.slice(0, 5)

const PRESETS: Array<{ id: string; name: string; description: string; schedule: NonNullable<ReportDefinition['schedule']> }> = [
  { id: 'weekly-board', name: 'Weekly board briefing', description: 'A high-level roundup, once a week.', schedule: { frequency: 'weekly', hour: 6, minute: 0, weekday: 1, monthDay: 1 } },
  { id: 'daily-ops', name: 'Daily ops digest', description: 'Every morning before the stand-up.', schedule: { frequency: 'daily', hour: 6, minute: 30, weekday: 1, monthDay: 1 } },
  { id: 'monthly-exec', name: 'Monthly executive', description: 'First of the month, for the long view.', schedule: { frequency: 'monthly', hour: 7, minute: 0, weekday: 1, monthDay: 1 } },
]

export const Route = createFileRoute('/_layout/reports/')({
  validateSearch: (search: Record<string, unknown>): { step?: Step } => ({
    step: STEPS.some((s) => s.id === search.step) ? (search.step as Step) : undefined,
  }),
  loader: () => getReports(),
  component: ReportsPage,
})

function emptyDefinition(data: ReportsData): ReportDefinition {
  const template = data.templates[0]
  return {
    id: '',
    name: '',
    template: template.id,
    theme: 'dark',
    elements: [...template.elements],
    scope: { window: '24h', ip: '', sensor: '', port: '', signature: '' },
    branding: { title: 'APIARY honeypot report', author: '', headerLeft: 'APIARY', headerRight: '', footerLeft: '', classification: 'TLP:AMBER' },
    schedule: null,
    created: '',
  }
}

// ---- Wizard steps ----------------------------------------------------------

type StepProps = { draft: ReportDefinition; update: (patch: Partial<ReportDefinition>) => void; data: ReportsData }

function DesignStep({ draft, update, data }: StepProps) {
  return (
    <VStack gap={5}>
      <TextInput label="Report name" isRequired value={draft.name} onChange={(name) => update({ name })} placeholder="e.g. Weekly board briefing" />
      <RadioList
        label="Template"
        value={draft.template}
        onChange={(template) => update({ template, elements: [...(data.templates.find((t) => t.id === template)?.elements ?? [])] })}
      >
        {data.templates.map((t) => (
          <RadioListItem key={t.id} value={t.id} label={t.name} description={t.description} />
        ))}
      </RadioList>
      <CheckboxList label="Sections" description="Picking a template preselects its sections; adjust freely." value={draft.elements} onChange={(elements) => update({ elements })}>
        {data.elements.map((e) => (
          <CheckboxListItem key={e.id} value={e.id} label={e.label} description={e.description} />
        ))}
      </CheckboxList>
      <SegmentedControl label="PDF theme" value={draft.theme} onChange={(theme) => update({ theme: theme as ReportDefinition['theme'] })}>
        <SegmentedControlItem value="dark" label="Dark" />
        <SegmentedControlItem value="light" label="Light" />
      </SegmentedControl>
    </VStack>
  )
}

function ScopeStep({ draft, update }: StepProps) {
  const set = (patch: Partial<ReportDefinition['scope']>) => update({ scope: { ...draft.scope, ...patch } })
  return (
    <FormLayout>
      <Selector label="Observation window" value={draft.scope.window} onChange={(window) => set({ window })} options={WINDOWS} />
      <TextInput label="Source IP" isOptional value={draft.scope.ip} onChange={(ip) => set({ ip })} placeholder="203.0.113.7" />
      <TextInput label="Sensor" isOptional value={draft.scope.sensor} onChange={(sensor) => set({ sensor })} placeholder="cowrie-vps-01" />
      <TextInput label="Port" isOptional value={draft.scope.port} onChange={(port) => set({ port })} placeholder="22" />
      <TextInput label="IDS signature" isOptional value={draft.scope.signature} onChange={(signature) => set({ signature })} placeholder="ET SCAN" />
    </FormLayout>
  )
}

function ScheduleStep({ draft, update }: StepProps) {
  const schedule = draft.schedule
  const set = (patch: Partial<NonNullable<ReportDefinition['schedule']>>) =>
    update({ schedule: { ...(schedule ?? PRESETS[1].schedule), ...patch } })
  return (
    <VStack gap={5}>
      <Switch
        label="Run on a schedule"
        description="Off means the report is only generated on demand."
        value={schedule !== null}
        onChange={(on) => update({ schedule: on ? { ...PRESETS[1].schedule } : null })}
      />
      <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={3}>
        {PRESETS.map((preset) => (
          <SelectableCard
            key={preset.id}
            label={preset.name}
            isSelected={schedule !== null && describeSchedule(schedule) === describeSchedule(preset.schedule)}
            onChange={() => update({ schedule: { ...preset.schedule } })}
          >
            <VStack gap={1}>
              <Text weight="semibold">{preset.name}</Text>
              <Text type="supporting">{preset.description}</Text>
              <Token size="sm" label={describeSchedule(preset.schedule)} />
            </VStack>
          </SelectableCard>
        ))}
      </Grid>
      {schedule && (
        <FormLayout direction="horizontal">
          <Selector
            label="Frequency"
            value={schedule.frequency}
            onChange={(frequency) => set({ frequency: frequency as ReportFrequency })}
            options={['daily', 'weekly', 'monthly']}
          />
          {schedule.frequency === 'weekly' && (
            <Selector
              label="Weekday"
              value={String(schedule.weekday)}
              onChange={(weekday) => set({ weekday: Number(weekday) })}
              options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAYS[d] }))}
            />
          )}
          {schedule.frequency === 'monthly' && (
            <NumberInput label="Day of month" value={schedule.monthDay} onChange={(monthDay) => set({ monthDay: Math.min(28, Math.max(1, monthDay)) })} />
          )}
          <NumberInput label="Hour (UTC)" value={schedule.hour} onChange={(hour) => set({ hour: Math.min(23, Math.max(0, hour)) })} />
          <NumberInput label="Minute" value={schedule.minute} onChange={(minute) => set({ minute: Math.min(59, Math.max(0, minute)) })} />
        </FormLayout>
      )}
    </VStack>
  )
}

function BrandingStep({ draft, update }: StepProps) {
  const set = (patch: Partial<ReportDefinition['branding']>) => update({ branding: { ...draft.branding, ...patch } })
  const b = draft.branding
  return (
    <FormLayout>
      <TextInput label="Cover title" value={b.title} onChange={(title) => set({ title })} />
      <TextInput label="Author" isOptional value={b.author} onChange={(author) => set({ author })} />
      <TextInput label="Header, left" isOptional value={b.headerLeft} onChange={(headerLeft) => set({ headerLeft })} />
      <TextInput label="Header, right" isOptional value={b.headerRight} onChange={(headerRight) => set({ headerRight })} />
      <TextInput label="Footer, left" isOptional value={b.footerLeft} onChange={(footerLeft) => set({ footerLeft })} />
      <Selector
        label="Classification"
        value={b.classification}
        onChange={(classification) => set({ classification })}
        options={['TLP:CLEAR', 'TLP:GREEN', 'TLP:AMBER', 'TLP:AMBER+STRICT', 'TLP:RED']}
      />
    </FormLayout>
  )
}

function Library({ data, onEdit }: { data: ReportsData; onEdit: (definition: ReportDefinition) => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'definition' | 'report'; id: string; name: string } | null>(null)
  const navigate = useNavigate()
  const act = async (id: string, write: () => Promise<unknown>) => {
    setBusy(id)
    try {
      await write()
      await router.invalidate()
    } finally {
      setBusy(null)
    }
  }

  const definitionColumns: TableColumn<ReportDefinition>[] = [
    { key: 'name', header: 'Definition', width: proportional(2), renderCell: (row) => <Link href={`/reports/definitions/${row.id}`}>{row.name}</Link> },
    { key: 'template', header: 'Template', width: pixel(160), renderCell: (row) => <Token size="sm" label={data.templates.find((t) => t.id === row.template)?.name ?? row.template} /> },
    { key: 'schedule', header: 'Schedule', width: proportional(2), renderCell: (row) => describeSchedule(row.schedule) },
    {
      key: 'id',
      header: '',
      width: pixel(248),
      renderCell: (row) => (
        <HStack gap={1}>
          <Button label="Generate" size="sm" isLoading={busy === row.id} onClick={() => act(row.id, () => generateReport(row.id))} />
          <Button label="Edit" size="sm" variant="secondary" onClick={() => onEdit(row)} />
          <Button label="Delete" size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'definition', id: row.id, name: row.name })} />
        </HStack>
      ),
    },
  ]
  const reportColumns: TableColumn<GeneratedReport>[] = [
    { key: 'createdAt', header: 'Created', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.createdAt)}</Text> },
    { key: 'title', header: 'Title', width: proportional(2), renderCell: (row) => <Link href={`/reports/generated/${row.id}`}>{row.title}</Link> },
    { key: 'origin', header: 'Origin', width: pixel(96), renderCell: (row) => <Token size="sm" label={row.origin} color={row.origin === 'schedule' ? 'blue' : 'gray'} /> },
    { key: 'sizeBytes', header: 'Size', width: pixel(80), align: 'end', renderCell: (row) => `${Math.round(row.sizeBytes / 1024)} KB` },
    {
      key: 'id',
      header: '',
      width: pixel(168),
      renderCell: (row) => (
        <HStack gap={1}>
          <Button label="View" size="sm" variant="secondary" onClick={() => void navigate({ href: `/reports/generated/${row.id}` })} />
          <Button label="Delete" size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'report', id: row.id, name: row.title })} />
        </HStack>
      ),
    },
  ]

  return (
    <VStack gap={5}>
      <Panel title="Definitions">
        {data.definitions.length ? (
          <Table data={data.definitions} columns={definitionColumns} idKey="id" density="compact" />
        ) : (
          <EmptyState isCompact title="No saved definitions" description="Build one with the steps above." />
        )}
      </Panel>
      <Panel title="Generated reports">
        {data.generated.length ? (
          <Table data={data.generated} columns={reportColumns} idKey="id" density="compact" />
        ) : (
          <EmptyState isCompact title="No PDFs yet" description="Generate a definition to produce one." />
        )}
      </Panel>
      <AlertDialog
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === 'definition' ? 'Delete this definition?' : 'Delete this report?'}
        description={`“${confirm?.name ?? ''}” will be removed permanently.${confirm?.kind === 'definition' ? ' PDFs it already produced stay in the library.' : ''}`}
        actionLabel="Delete"
        isActionLoading={busy === confirm?.id}
        onAction={async () => {
          if (!confirm) return
          const { kind, id } = confirm
          await act(id, () => (kind === 'definition' ? deleteReportDefinition(id) : deleteGeneratedReport(id)))
          setConfirm(null)
        }}
      />
    </VStack>
  )
}

// ---- Page ------------------------------------------------------------------

function ReportsPage() {
  const data = Route.useLoaderData()
  const { step = 'design' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [draft, setDraft] = useState<ReportDefinition>(() => emptyDefinition(data))
  const [saving, setSaving] = useState(false)

  const go = (next: Step) => void navigate({ search: { step: next === 'design' ? undefined : next } })
  useViewTabs({
    label: 'Reports studio steps',
    tabs: STEPS.map((s, i) => ({ id: s.id, label: s.id === 'library' ? s.label : `${i + 1}. ${s.label}` })),
    value: step,
    onChange: (value) => go(value as Step),
  })
  const update = (patch: Partial<ReportDefinition>) => setDraft((d) => ({ ...d, ...patch }))
  const current = STEPS.find((s) => s.id === step)!
  const index = BUILD_STEPS.findIndex((s) => s.id === step)
  const props = { draft, update, data }

  const save = async (andGenerate: boolean) => {
    setSaving(true)
    try {
      const saved = await saveReportDefinition(draft)
      if (andGenerate) await generateReport(saved.id)
      setDraft(emptyDefinition(data))
      await router.invalidate()
      go('library')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageFrame
      title="Reports studio"
      description="Build report definitions step by step, schedule them, and keep the PDFs they produce."
      actions={
        draft.id ? (
          <HStack gap={2} vAlign="center">
            <Token size="sm" color="blue" label={`Editing: ${draft.name}`} />
            <Button label="New definition" size="sm" variant="ghost" onClick={() => setDraft(emptyDefinition(data))} />
          </HStack>
        ) : undefined
      }
    >
      <VStack gap={5}>
        <VStack gap={1}>
          <Heading level={2}>{current.label}</Heading>
          <Text color="secondary">{current.lede}</Text>
        </VStack>
        {step === 'design' && <DesignStep {...props} />}
        {step === 'scope' && <ScopeStep {...props} />}
        {step === 'schedule' && <ScheduleStep {...props} />}
        {step === 'branding' && <BrandingStep {...props} />}
        {step === 'review' && <ReviewStep {...props} />}
        {step === 'library' && (
          <Library
            data={data}
            onEdit={(definition) => {
              setDraft(structuredClone(definition))
              go('design')
            }}
          />
        )}
        {index >= 0 && (
          <HStack gap={2} hAlign="between">
            <Button label="Back" variant="secondary" isDisabled={index === 0} onClick={() => go(BUILD_STEPS[index - 1].id)} />
            {step === 'review' ? (
              <HStack gap={2}>
                <Button label="Save" variant="secondary" isDisabled={!draft.name.trim()} isLoading={saving} onClick={() => save(false)} />
                <Button label="Save and generate" isDisabled={!draft.name.trim()} isLoading={saving} onClick={() => save(true)} />
              </HStack>
            ) : (
              <Button label="Next" onClick={() => go(BUILD_STEPS[index + 1].id)} />
            )}
          </HStack>
        )}
      </VStack>
    </PageFrame>
  )
}
