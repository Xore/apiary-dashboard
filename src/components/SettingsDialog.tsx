import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Switch } from '@astryxdesign/core/Switch'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Heading, Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { ContainerStateLabel } from './FeedState'
import { getSettings, rollbackConfig, runServiceAction, saveAdminSection, savePreferences } from '#/data/queries'
import type { AuditEntry, ConfigRevision, Preferences, ServiceStatus, SettingsData } from '#/data/types'
import { formatDateTime } from '#/lib/format'
import { NAV_SECTIONS } from '#/lib/nav'

export const PANES = {
  account: { title: 'Account', desc: 'Your identity as provided by the auth service. Credentials are managed there, never here.', admin: false, keywords: 'profile identity role session sign out' },
  appearance: { title: 'Appearance', desc: 'Theme, density, motion, and readability of the dashboard.', admin: false, keywords: 'theme dark light density compact motion' },
  navigation: { title: 'Navigation & tables', desc: 'Where you land, and how tables and detail views behave.', admin: false, keywords: 'landing start page rows per page new tab' },
  time: { title: 'Time & live data', desc: 'Timezone, clock format, refresh cadence, and notifications.', admin: false, keywords: 'timezone utc clock 24-hour refresh notifications' },
  map: { title: 'Map & investigation', desc: 'Default time window for investigations.', admin: false, keywords: 'window investigation default' },
  branding: { title: 'Branding & text', desc: 'Product labels, help links, notices, and footer copy. Plain text; https links only.', admin: true, keywords: 'product name help link notice footer' },
  behavior: { title: 'Dashboard behavior', desc: 'Safe bounded defaults for every user.', admin: true, keywords: 'default window rows' },
  honeypot: { title: 'Honeypot operations', desc: 'Staged operational thresholds. Saving never restarts anything.', admin: true, keywords: 'alert cooldown blocklist ttl sandbox concurrency llm report' },
  users: { title: 'Users', desc: 'Read-only projection of dashboard activity. Accounts are managed in the auth service.', admin: true, keywords: 'users accounts roles' },
  services: { title: 'Services', desc: 'Live container status for sensors and workers, with start, stop, and restart.', admin: true, keywords: 'containers docker restart stop start' },
  'report-presets': { title: 'Report Studio presets', desc: 'Template names and descriptions live with the reports studio.', admin: true, keywords: 'reports templates presets' },
  canarytokens: { title: 'Canarytokens', desc: 'Honeytokens for use outside this honeypot.', admin: true, keywords: 'canary tokens honeytoken' },
  elasticsearch: { title: 'Elasticsearch history', desc: 'Raw query search across every indexed document.', admin: true, keywords: 'elasticsearch lucene query raw' },
  'dead-letters': { title: 'Ingest dead letters', desc: 'Documents Elasticsearch rejected.', admin: true, keywords: 'dead letters rejected ingest' },
  history: { title: 'Configuration history', desc: 'Retained configuration revisions with rollback.', admin: true, keywords: 'revisions rollback history' },
  audit: { title: 'Audit log', desc: 'Settings changes with actor, fields, and result.', admin: true, keywords: 'audit actor changes' },
} as const
export type PaneId = keyof typeof PANES
export const PANE_IDS = Object.keys(PANES) as PaneId[]


// ---- Personal panes ----------------------------------------------------------

type PrefProps = { prefs: Preferences; set: (patch: Partial<Preferences>) => void }

function AppearancePane({ prefs, set }: PrefProps) {
  return (
    <VStack gap={5}>
      <SegmentedControl label="Theme" value={prefs.theme} onChange={(theme) => set({ theme: theme as Preferences['theme'] })}>
        <SegmentedControlItem value="system" label="System" />
        <SegmentedControlItem value="dark" label="Dark" />
        <SegmentedControlItem value="light" label="Light" />
      </SegmentedControl>
      <SegmentedControl label="Density" value={prefs.density} onChange={(density) => set({ density: density as Preferences['density'] })}>
        <SegmentedControlItem value="comfortable" label="Comfortable" />
        <SegmentedControlItem value="compact" label="Compact" />
      </SegmentedControl>
      <Selector
        label="Motion"
        value={prefs.motion}
        onChange={(motion) => set({ motion: motion as Preferences['motion'] })}
        options={[
          { value: 'system', label: 'Follow the system setting' },
          { value: 'on', label: 'Reduced' },
          { value: 'off', label: 'Full' },
        ]}
      />
    </VStack>
  )
}

function NavigationPane({ prefs, set }: PrefProps) {
  return (
    <FormLayout>
      <Selector
        label="Landing page"
        value={prefs.landing}
        onChange={(landing) => set({ landing })}
        options={NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ value: i.to, label: i.label })))}
      />
      <Selector label="Rows per page" value={String(prefs.rowsPerPage)} onChange={(v) => set({ rowsPerPage: Number(v) })} options={['10', '25', '50', '100']} />
      <Switch label="Open detail pages in a new tab" value={prefs.openDetailsInNewTab} onChange={(openDetailsInNewTab) => set({ openDetailsInNewTab })} />
    </FormLayout>
  )
}

function TimePane({ prefs, set }: PrefProps) {
  return (
    <FormLayout>
      <SegmentedControl label="Timezone" value={prefs.timezone} onChange={(timezone) => set({ timezone: timezone as Preferences['timezone'] })}>
        <SegmentedControlItem value="UTC" label="UTC" />
        <SegmentedControlItem value="local" label="Browser local" />
      </SegmentedControl>
      <SegmentedControl label="Clock" value={prefs.clock} onChange={(clock) => set({ clock: clock as Preferences['clock'] })}>
        <SegmentedControlItem value="h24" label="24-hour" />
        <SegmentedControlItem value="h12" label="12-hour" />
      </SegmentedControl>
      <SegmentedControl label="Timestamps" value={prefs.timestamps} onChange={(timestamps) => set({ timestamps: timestamps as Preferences['timestamps'] })}>
        <SegmentedControlItem value="absolute" label="Absolute" />
        <SegmentedControlItem value="relative" label="Relative" />
      </SegmentedControl>
      <NumberInput label="Live refresh (seconds)" value={prefs.refreshSeconds} onChange={(v) => set({ refreshSeconds: Math.min(300, Math.max(10, v)) })} />
      <Switch label="Notify on critical alerts" value={prefs.notifyCritical} onChange={(notifyCritical) => set({ notifyCritical })} />
      <Switch label="Notify when a canarytoken fires" value={prefs.notifyCanary} onChange={(notifyCanary) => set({ notifyCanary })} />
    </FormLayout>
  )
}

function MapPane({ prefs, set }: PrefProps) {
  return (
    <Selector
      label="Default investigation window"
      value={prefs.defaultWindow}
      onChange={(defaultWindow) => set({ defaultWindow })}
      options={[
        { value: '1h', label: 'Last hour' },
        { value: '6h', label: 'Last 6 hours' },
        { value: '24h', label: 'Last 24 hours' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
      ]}
    />
  )
}

// ---- Admin panes -------------------------------------------------------------

// Saves reload the dialog's own data (it has no route loader).
const ReloadContext = createContext<() => Promise<void>>(async () => {})

function useSave() {
  const reload = useContext(ReloadContext)
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, write: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await write()
      await reload()
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

function BrandingPane({ data }: { data: SettingsData }) {
  const [form, setForm] = useState(data.branding)
  const { busy, run } = useSave()
  const dirty = JSON.stringify(form) !== JSON.stringify(data.branding)
  const badUrl = form.helpUrl !== '' && !form.helpUrl.startsWith('https://')
  return (
    <VStack gap={4}>
      <FormLayout>
        <TextInput label="Product name" value={form.productName} onChange={(productName) => setForm({ ...form, productName })} />
        <TextInput label="Help link" description={badUrl ? 'Only https links are allowed.' : undefined} value={form.helpUrl} onChange={(helpUrl) => setForm({ ...form, helpUrl })} />
        <TextInput label="Shell notice" isOptional value={form.notice} onChange={(notice) => setForm({ ...form, notice })} />
        <TextInput label="Footer" value={form.footer} onChange={(footer) => setForm({ ...form, footer })} />
      </FormLayout>
      <HStack gap={2} hAlign="end">
        <Button label="Revert" variant="secondary" isDisabled={!dirty} onClick={() => setForm(data.branding)} />
        <Button label="Save" isDisabled={!dirty || badUrl} isLoading={busy === 'branding'} onClick={() => run('branding', () => saveAdminSection('branding', form))} />
      </HStack>
    </VStack>
  )
}

function HoneypotPane({ data }: { data: SettingsData }) {
  const [form, setForm] = useState(data.honeypot)
  const { busy, run } = useSave()
  const dirty = JSON.stringify(form) !== JSON.stringify(data.honeypot)
  return (
    <VStack gap={4}>
      <FormLayout>
        <NumberInput label="Alert cooldown (minutes)" value={form.alertCooldownMinutes} onChange={(v) => setForm({ ...form, alertCooldownMinutes: Math.max(1, v) })} />
        <NumberInput label="Manual blocklist TTL (hours)" value={form.blocklistTtlHours} onChange={(v) => setForm({ ...form, blocklistTtlHours: Math.max(1, v) })} />
        <NumberInput label="Sandbox concurrency" value={form.sandboxConcurrency} onChange={(v) => setForm({ ...form, sandboxConcurrency: Math.min(8, Math.max(1, v)) })} />
        <Switch label="LLM daily report" description="Generates a model-written summary each morning." value={form.llmDailyReport} onChange={(llmDailyReport) => setForm({ ...form, llmDailyReport })} />
      </FormLayout>
      <Text type="supporting">Saved values are staged. They apply on the next operator-run restart of the affected service.</Text>
      <HStack gap={2} hAlign="end">
        <Button label="Revert" variant="secondary" isDisabled={!dirty} onClick={() => setForm(data.honeypot)} />
        <Button label="Save" isDisabled={!dirty} isLoading={busy === 'honeypot'} onClick={() => run('honeypot', () => saveAdminSection('honeypot', form))} />
      </HStack>
    </VStack>
  )
}

function ServicesPane({ services }: { services: ServiceStatus[] }) {
  const { busy, run } = useSave()
  const columns: TableColumn<ServiceStatus>[] = [
    { key: 'name', header: 'Container', width: proportional(2), renderCell: (row) => <ContainerStateLabel name={row.name} state={row.state} /> },
    { key: 'stack', header: 'Stack', width: pixel(168) },
    { key: 'uptime', header: 'Uptime', width: pixel(88) },
    {
      key: 'image',
      header: '',
      width: pixel(184),
      renderCell: (row) => (
        <HStack gap={1}>
          {row.state === 'exited' ? (
            <Button label="Start" size="sm" isLoading={busy === row.name} onClick={() => run(row.name, () => runServiceAction(row.name, 'start'))} />
          ) : (
            <>
              <Button label="Restart" size="sm" variant="secondary" isLoading={busy === row.name} onClick={() => run(row.name, () => runServiceAction(row.name, 'restart'))} />
              <Button label="Stop" size="sm" variant="ghost" isDisabled={busy === row.name} onClick={() => run(row.name, () => runServiceAction(row.name, 'stop'))} />
            </>
          )}
        </HStack>
      ),
    },
  ]
  return <Table data={services} columns={columns} idKey="name" density="compact" />
}

function HistoryPane({ history }: { history: ConfigRevision[] }) {
  const { busy, run } = useSave()
  const [target, setTarget] = useState<ConfigRevision | null>(null)
  const columns: TableColumn<ConfigRevision>[] = [
    { key: 'at', header: 'When', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.at)}</Text> },
    { key: 'section', header: 'Section', width: pixel(136), renderCell: (row) => <Token size="sm" label={row.section} /> },
    { key: 'summary', header: 'Change', width: proportional(2) },
    { key: 'actor', header: 'By', width: pixel(96) },
    { key: 'id', header: '', width: pixel(112), renderCell: (row) => <Button label="Roll back" size="sm" variant="secondary" onClick={() => setTarget(row)} /> },
  ]
  return (
    <>
      <Table data={history} columns={columns} idKey="id" density="compact" />
      <AlertDialog
        isOpen={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={`Roll back to ${target?.id ?? ''}?`}
        description={`Restores the ${target?.section ?? ''} section as it was at that revision. The rollback itself is recorded as a new revision.`}
        actionLabel="Roll back"
        actionVariant="primary"
        isActionLoading={busy === 'rollback'}
        onAction={async () => {
          if (target) await run('rollback', () => rollbackConfig(target.id))
          setTarget(null)
        }}
      />
    </>
  )
}

const auditColumns: TableColumn<AuditEntry>[] = [
  { key: 'at', header: 'When', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.at)}</Text> },
  { key: 'actor', header: 'Actor', width: pixel(96) },
  { key: 'action', header: 'Action', width: pixel(152), renderCell: (row) => <Text type="code">{row.action}</Text> },
  { key: 'fields', header: 'Fields', width: proportional(2), renderCell: (row) => <Text type="code">{row.fields.join(', ')}</Text> },
  { key: 'result', header: 'Result', width: pixel(96), renderCell: (row) => <Token size="sm" color={row.result === 'ok' ? 'green' : 'red'} label={row.result} /> },
]

function LinkPane({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} isStandalone>
      {label}
    </Link>
  )
}

// ---- Page --------------------------------------------------------------------

type BodyProps = {
  data: SettingsData
  reload: () => Promise<void>
  pane: PaneId
  onPane: (pane: PaneId) => void
  onDirtyChange: (dirty: boolean) => void
}

function SettingsBody({ data, reload, pane, onPane, onDirtyChange }: BodyProps) {
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const [query, setQuery] = useState('')
  const [prefs, setPrefs] = useState(data.preferences)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(prefs) !== JSON.stringify(data.preferences)
  const set = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }))

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const needle = query.trim().toLowerCase()
  const visible = PANE_IDS.filter((id) => !needle || `${PANES[id].title} ${PANES[id].desc} ${PANES[id].keywords}`.toLowerCase().includes(needle))
  const meta = PANES[pane]
  const isPrefPane = ['appearance', 'navigation', 'time', 'map'].includes(pane)

  const rail = (
    <VStack gap={3}>
      <TextInput label="Search settings" isLabelHidden size="sm" placeholder="Search settings" value={query} onChange={setQuery} />
      {(['Personal', 'Administration'] as const).map((group) => {
        const ids = visible.filter((id) => PANES[id].admin === (group === 'Administration'))
        return ids.length ? (
          <VStack key={group} gap={1}>
            <Text type="label" color="secondary">
              {group}
            </Text>
            <List density="compact">
              {ids.map((id) => (
                <ListItem key={id} label={PANES[id].title} isSelected={id === pane} onClick={() => onPane(id)} />
              ))}
            </List>
          </VStack>
        ) : null
      })}
      {visible.length === 0 && <Text type="supporting">No setting matches “{query}”.</Text>}
    </VStack>
  )

  const panes: Record<PaneId, ReactNode> = {
    account: (
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="Name">{data.user.name}</MetadataListItem>
        <MetadataListItem label="Email">{data.user.email}</MetadataListItem>
        <MetadataListItem label="Roles">{data.user.roles.join(', ')}</MetadataListItem>
        <MetadataListItem label="Session">Signed in with the dashboard's OIDC provider (mock)</MetadataListItem>
      </MetadataList>
    ),
    appearance: <AppearancePane prefs={prefs} set={set} />,
    navigation: <NavigationPane prefs={prefs} set={set} />,
    time: <TimePane prefs={prefs} set={set} />,
    map: <MapPane prefs={prefs} set={set} />,
    branding: <BrandingPane key={JSON.stringify(data.branding)} data={data} />,
    behavior: (
      <Text color="secondary">
        Bounded defaults (window, rows per page) currently mirror the personal panes; per-user overrides win.
      </Text>
    ),
    honeypot: <HoneypotPane key={JSON.stringify(data.honeypot)} data={data} />,
    users: (
      <Table
        data={[
          { id: 'operator', name: 'Operator', roles: 'admin', lastSeen: formatDateTime('2026-09-23T12:00:00Z') },
          { id: 'analyst', name: 'Analyst', roles: 'viewer', lastSeen: formatDateTime('2026-09-22T17:40:00Z') },
        ]}
        columns={[
          { key: 'name', header: 'User', width: proportional(1) },
          { key: 'roles', header: 'Roles', width: pixel(120) },
          { key: 'lastSeen', header: 'Last seen', width: pixel(200) },
        ]}
        idKey="id"
        density="compact"
      />
    ),
    services: <ServicesPane services={data.services} />,
    'report-presets': <LinkPane href="/reports?step=library" label="Open the reports library" />,
    canarytokens: <LinkPane href="/canarytokens" label="Open canarytokens" />,
    elasticsearch: <LinkPane href="/history" label="Open event history search" />,
    'dead-letters': <LinkPane href="/dead-letters" label="Open ingest dead letters" />,
    history: <HistoryPane history={data.history} />,
    audit: <Table data={data.audit} columns={auditColumns} idKey="id" density="compact" />,
  }

  const content = (
    <VStack gap={4}>
      <VStack gap={1}>
        <HStack gap={2} vAlign="center">
          <Heading level={2}>{meta.title}</Heading>
          {meta.admin && <Token size="sm" label="admin" />}
        </HStack>
        <Text color="secondary">{meta.desc}</Text>
      </VStack>
      <Card>{panes[pane]}</Card>
      {isPrefPane && (
        <HStack gap={2} hAlign="end" vAlign="center">
          {dirty && <Text type="supporting">Unsaved changes</Text>}
          <Button label="Revert" variant="secondary" isDisabled={!dirty} onClick={() => setPrefs(data.preferences)} />
          <Button
            label="Save preferences"
            isDisabled={!dirty}
            isLoading={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await savePreferences(prefs)
                await reload()
              } finally {
                setSaving(false)
              }
            }}
          />
        </HStack>
      )}
    </VStack>
  )

  return (
    <ReloadContext.Provider value={reload}>
      <HStack gap={5} vAlign="start">
        {!isNarrow && (
          <VStack gap={0} width={240}>
            {rail}
          </VStack>
        )}
        <StackItem size="fill">
          <VStack gap={5}>
            {isNarrow && rail}
            {content}
          </VStack>
        </StackItem>
      </HStack>
    </ReloadContext.Provider>
  )
}

/** Settings as a modal over the current page. Loads its data on open;
 * closing with unsaved preference changes asks first. */
export function SettingsDialog({ pane, onPane, onClose }: { pane: PaneId; onPane: (pane: PaneId) => void; onClose: () => void }) {
  const [data, setData] = useState<SettingsData | null>(null)
  const [dirty, setDirty] = useState(false)
  const reload = useCallback(async () => setData(await getSettings()), [])
  useEffect(() => {
    void reload()
  }, [reload])
  const close = () => {
    if (!dirty || window.confirm('Discard unsaved preference changes?')) onClose()
  }
  return (
    <Dialog isOpen onOpenChange={(open) => !open && close()} width={1040} maxHeight="88dvh" padding={5} purpose="form">
      <DialogHeader title="Settings" subtitle="Personal preferences, and platform configuration for admins." onOpenChange={(open) => !open && close()} />
      {data ? (
        <SettingsBody data={data} reload={reload} pane={pane} onPane={onPane} onDirtyChange={setDirty} />
      ) : (
        <Skeleton height={320} />
      )}
    </Dialog>
  )
}
