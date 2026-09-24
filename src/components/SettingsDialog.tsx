/**
 * Settings as a modal over the current page, after the Astryx
 * settings-dialog template: a side navigation grouped by who a change affects
 * (the current panel highlighted), search over single settings, one fixed
 * height so the frame never jumps between panels, a close control pinned while
 * the panel scrolls, and muted cards of aligned rows.
 *
 * Personal settings apply as they change. Administration sections change
 * things for everyone, so they stay staged behind Save and Revert; leaving one
 * with unsaved edits asks first, inside this dialog (never a second dialog).
 */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'
import { Divider } from '@astryxdesign/core/Divider'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Switch } from '@astryxdesign/core/Switch'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Icon } from '@astryxdesign/core/Icon'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { useNavigate } from '@tanstack/react-router'
import { ContainerStateLabel } from './FeedState'
import { CONTROL_WIDTH, PanelColumn, PinnedClose, SettingsCard, SettingsPanelHeading, SettingsPanelTabs, SettingsRow, SettingsSearchInput, SettingsSearchResults, SettingsSideNav, ThemeChoiceCards, useSettingsSearch } from './settings/parts'
import { isAdminPanel, panelOf } from './settings/registry'
import type { PaneId } from './settings/registry'
import { getSettings, rollbackConfig, runServiceAction, saveAdminSection, savePreferences } from '#/data/queries'
import type { AuditEntry, ConfigRevision, Preferences, ServiceStatus, SettingsData } from '#/data/types'
import { formatDateTime } from '#/lib/format'
import { NAV_SECTIONS } from '#/lib/nav'

export type { PaneId } from './settings/registry'
export { PANE_IDS } from './settings/registry'

const NARROW_VIEWPORT = '(max-width: 640px)'
const SHELL_HEIGHT = 'min(800px, calc(100dvh - 2rem))'

// ---- Shared state for the panels ---------------------------------------------------

type SettingsContextValue = {
  data: SettingsData
  reload: () => Promise<void>
  prefs: Preferences
  setPref: (patch: Partial<Preferences>) => void
  /** An admin panel reports whether it holds unsaved edits. */
  setDirty: (panel: PaneId, dirty: boolean) => void
  openPage: (href: string) => void
}
const SettingsContext = createContext<SettingsContextValue | null>(null)
const useSettings = () => useContext(SettingsContext)!

/** An admin section's staged form: dirty tracking, revert and save. */
function useStagedForm<T>(panel: PaneId, saved: T, save: (form: T) => Promise<unknown>) {
  const { reload, setDirty } = useSettings()
  const [form, setForm] = useState(saved)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  useEffect(() => setDirty(panel, dirty), [panel, dirty, setDirty])
  useEffect(() => () => setDirty(panel, false), [panel, setDirty])
  const actions = (isValid = true) => (
    <HStack gap={2} hAlign="end" vAlign="center">
      {dirty && <Text type="supporting">Unsaved changes</Text>}
      <Button label="Revert" variant="secondary" isDisabled={!dirty} onClick={() => setForm(saved)} />
      <Button
        label="Save"
        isDisabled={!dirty || !isValid}
        isLoading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await save(form)
            await reload()
          } finally {
            setBusy(false)
          }
        }}
      />
    </HStack>
  )
  return { form, setForm, actions }
}

// ---- Personal panels (apply as they change) --------------------------------------

function AccountPanel() {
  const { data } = useSettings()
  return (
    <SettingsCard title="Identity">
      <SettingsRow setting="name" control={<Text>{data.user.name}</Text>} />
      <SettingsRow setting="email" control={<Text>{data.user.email}</Text>} />
      <SettingsRow setting="roles" control={<HStack gap={1}>{data.user.roles.map((role) => <Token key={role} size="sm" label={role} />)}</HStack>} />
      <SettingsRow setting="session" control={<Text type="supporting">OIDC provider (mock)</Text>} />
    </SettingsCard>
  )
}

function AppearancePanel() {
  const { prefs, setPref } = useSettings()
  return (
    <SettingsCard title="Display">
      <SettingsRow setting="theme" detail={<ThemeChoiceCards value={prefs.theme} onChange={(theme) => setPref({ theme })} />} />
      <SettingsRow
        setting="density"
        control={
          <SegmentedControl label="Density" value={prefs.density} onChange={(density) => setPref({ density: density as Preferences['density'] })}>
            <SegmentedControlItem value="comfortable" label="Comfortable" />
            <SegmentedControlItem value="compact" label="Compact" />
          </SegmentedControl>
        }
      />
      <SettingsRow
        setting="motion"
        control={
          <SegmentedControl label="Motion" value={prefs.motion} onChange={(motion) => setPref({ motion: motion as Preferences['motion'] })}>
            <SegmentedControlItem value="system" label="System" />
            <SegmentedControlItem value="on" label="Reduced" />
            <SegmentedControlItem value="off" label="Full" />
          </SegmentedControl>
        }
      />
    </SettingsCard>
  )
}

function NavigationPanel() {
  const { prefs, setPref } = useSettings()
  return (
    <SettingsCard title="Pages and lists">
      <SettingsRow
        setting="landing"
        control={<Selector label="Landing page" isLabelHidden width={CONTROL_WIDTH} value={prefs.landing} onChange={(landing) => setPref({ landing })} options={NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ value: i.to, label: i.label })))} />}
      />
      <SettingsRow setting="rowsPerPage" control={<Selector label="Rows per page" isLabelHidden width={CONTROL_WIDTH} value={String(prefs.rowsPerPage)} onChange={(v) => setPref({ rowsPerPage: Number(v) })} options={['10', '25', '50', '100']} />} />
      <SettingsRow setting="newTab" control={<Switch label="Open detail pages in a new tab" isLabelHidden value={prefs.openDetailsInNewTab} onChange={(openDetailsInNewTab) => setPref({ openDetailsInNewTab })} />} />
    </SettingsCard>
  )
}

function TimePanel() {
  const { prefs, setPref } = useSettings()
  return (
    <>
      <SettingsCard title="Time">
        <SettingsRow
          setting="timezone"
          control={
            <SegmentedControl label="Timezone" value={prefs.timezone} onChange={(timezone) => setPref({ timezone: timezone as Preferences['timezone'] })}>
              <SegmentedControlItem value="UTC" label="UTC" />
              <SegmentedControlItem value="local" label="Browser local" />
            </SegmentedControl>
          }
        />
        <SettingsRow
          setting="clock"
          control={
            <SegmentedControl label="Clock" value={prefs.clock} onChange={(clock) => setPref({ clock: clock as Preferences['clock'] })}>
              <SegmentedControlItem value="h24" label="24-hour" />
              <SegmentedControlItem value="h12" label="12-hour" />
            </SegmentedControl>
          }
        />
        <SettingsRow
          setting="timestamps"
          control={
            <SegmentedControl label="Timestamps" value={prefs.timestamps} onChange={(timestamps) => setPref({ timestamps: timestamps as Preferences['timestamps'] })}>
              <SegmentedControlItem value="absolute" label="Absolute" />
              <SegmentedControlItem value="relative" label="Relative" />
            </SegmentedControl>
          }
        />
        <SettingsRow setting="refresh" control={<NumberInput label="Live refresh" isLabelHidden width={CONTROL_WIDTH} value={prefs.refreshSeconds} onChange={(v) => setPref({ refreshSeconds: Math.min(300, Math.max(10, v)) })} />} />
      </SettingsCard>
      <SettingsCard title="Notifications">
        <SettingsRow setting="notifyCritical" control={<Switch label="Critical alerts" isLabelHidden value={prefs.notifyCritical} onChange={(notifyCritical) => setPref({ notifyCritical })} />} />
        <SettingsRow setting="notifyCanary" control={<Switch label="Canarytoken fires" isLabelHidden value={prefs.notifyCanary} onChange={(notifyCanary) => setPref({ notifyCanary })} />} />
      </SettingsCard>
    </>
  )
}

function InvestigationPanel() {
  const { prefs, setPref } = useSettings()
  return (
    <SettingsCard title="Investigations">
      <SettingsRow
        setting="defaultWindow"
        control={
          <Selector
            label="Default window"
            isLabelHidden
            width={CONTROL_WIDTH}
            value={prefs.defaultWindow}
            onChange={(defaultWindow) => setPref({ defaultWindow })}
            options={[
              { value: '1h', label: 'Last hour' },
              { value: '6h', label: 'Last 6 hours' },
              { value: '24h', label: 'Last 24 hours' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
            ]}
          />
        }
      />
    </SettingsCard>
  )
}

// ---- Administration panels (staged; affect everyone) -----------------------------

function BrandingPanel() {
  const { data } = useSettings()
  const { form, setForm, actions } = useStagedForm('branding', data.branding, (next) => saveAdminSection('branding', next))
  const badUrl = form.helpUrl !== '' && !form.helpUrl.startsWith('https://')
  return (
    <>
      <SettingsCard title="Labels">
        <SettingsRow setting="productName" control={<TextInput label="Product name" isLabelHidden width={CONTROL_WIDTH} value={form.productName} onChange={(productName) => setForm({ ...form, productName })} />} />
        <SettingsRow
          setting="helpUrl"
          control={<TextInput label="Help link" isLabelHidden width={CONTROL_WIDTH} value={form.helpUrl} onChange={(helpUrl) => setForm({ ...form, helpUrl })} status={badUrl ? { type: 'error', message: 'Only https links.' } : undefined} />}
        />
        <SettingsRow setting="notice" control={<TextInput label="Shell notice" isLabelHidden width={CONTROL_WIDTH} value={form.notice} onChange={(notice) => setForm({ ...form, notice })} placeholder="None" />} />
        <SettingsRow setting="footer" control={<TextInput label="Footer" isLabelHidden width={CONTROL_WIDTH} value={form.footer} onChange={(footer) => setForm({ ...form, footer })} />} />
      </SettingsCard>
      {actions(!badUrl)}
    </>
  )
}

function HoneypotPanel() {
  const { data } = useSettings()
  const { form, setForm, actions } = useStagedForm('honeypot', data.honeypot, (next) => saveAdminSection('honeypot', next))
  return (
    <>
      <SettingsCard title="Thresholds">
        <SettingsRow setting="alertCooldown" control={<NumberInput label="Alert cooldown" isLabelHidden width={CONTROL_WIDTH} value={form.alertCooldownMinutes} onChange={(v) => setForm({ ...form, alertCooldownMinutes: Math.max(1, v) })} />} />
        <SettingsRow setting="blocklistTtl" control={<NumberInput label="Manual block lifetime" isLabelHidden width={CONTROL_WIDTH} value={form.blocklistTtlHours} onChange={(v) => setForm({ ...form, blocklistTtlHours: Math.max(1, v) })} />} />
        <SettingsRow setting="sandboxConcurrency" control={<NumberInput label="Sandbox concurrency" isLabelHidden width={CONTROL_WIDTH} value={form.sandboxConcurrency} onChange={(v) => setForm({ ...form, sandboxConcurrency: Math.min(8, Math.max(1, v)) })} />} />
        <SettingsRow setting="llmDailyReport" control={<Switch label="LLM daily report" isLabelHidden value={form.llmDailyReport} onChange={(llmDailyReport) => setForm({ ...form, llmDailyReport })} />} />
      </SettingsCard>
      <Text type="supporting">Saved values are staged. They apply on the next operator-run restart of the affected service.</Text>
      {actions()}
    </>
  )
}

function BehaviorPanel() {
  return (
    <SettingsCard title="Defaults">
      <SettingsRow setting="defaults" control={<Token size="sm" label="Mirrors the personal panels" />} />
    </SettingsCard>
  )
}

function UsersPanel() {
  return (
    <SettingsCard>
      <SettingsRow
        setting="users"
        detail={
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
        }
      />
    </SettingsCard>
  )
}

function ServicesPanel() {
  const { data, reload } = useSettings()
  const [busy, setBusy] = useState<string | null>(null)
  const act = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setBusy(name)
    try {
      await runServiceAction(name, action)
      await reload()
    } finally {
      setBusy(null)
    }
  }
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
            <Button label="Start" size="sm" isLoading={busy === row.name} onClick={() => act(row.name, 'start')} />
          ) : (
            <>
              <Button label="Restart" size="sm" variant="secondary" isLoading={busy === row.name} onClick={() => act(row.name, 'restart')} />
              <Button label="Stop" size="sm" variant="ghost" isDisabled={busy === row.name} onClick={() => act(row.name, 'stop')} />
            </>
          )}
        </HStack>
      ),
    },
  ]
  return (
    <SettingsCard>
      <SettingsRow setting="services" detail={<Table data={data.services} columns={columns} idKey="name" density="compact" />} />
    </SettingsCard>
  )
}

function HistoryPanel() {
  const { data, reload } = useSettings()
  const [target, setTarget] = useState<ConfigRevision | null>(null)
  const [busy, setBusy] = useState(false)
  const columns: TableColumn<ConfigRevision>[] = [
    { key: 'at', header: 'When', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.at)}</Text> },
    { key: 'section', header: 'Section', width: pixel(136), renderCell: (row) => <Token size="sm" label={row.section} /> },
    { key: 'summary', header: 'Change', width: proportional(2) },
    { key: 'actor', header: 'By', width: pixel(96) },
    { key: 'id', header: '', width: pixel(112), renderCell: (row) => <Button label="Roll back" size="sm" variant="secondary" onClick={() => setTarget(row)} /> },
  ]
  return (
    <SettingsCard>
      <SettingsRow
        setting="history"
        detail={
          <VStack gap={2}>
            <Table data={data.history} columns={columns} idKey="id" density="compact" />
            {/* Confirmed in place rather than in a second dialog. */}
            {target && (
              <Banner
                status="warning"
                title={`Roll back ${target.section} to ${target.id}?`}
                description="Restores the section as it was at that revision. The rollback is recorded as a new revision."
                endContent={
                  <HStack gap={2}>
                    <Button label="Cancel" size="sm" variant="ghost" onClick={() => setTarget(null)} />
                    <Button
                      label="Roll back"
                      size="sm"
                      isLoading={busy}
                      onClick={async () => {
                        setBusy(true)
                        try {
                          await rollbackConfig(target.id)
                          await reload()
                        } finally {
                          setBusy(false)
                          setTarget(null)
                        }
                      }}
                    />
                  </HStack>
                }
              />
            )}
          </VStack>
        }
      />
    </SettingsCard>
  )
}

const auditColumns: TableColumn<AuditEntry>[] = [
  { key: 'at', header: 'When', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.at)}</Text> },
  { key: 'actor', header: 'Actor', width: pixel(96) },
  { key: 'action', header: 'Action', width: pixel(152), renderCell: (row) => <Text type="code">{row.action}</Text> },
  { key: 'fields', header: 'Fields', width: proportional(2), renderCell: (row) => <Text type="code">{row.fields.join(', ')}</Text> },
  { key: 'result', header: 'Result', width: pixel(96), renderCell: (row) => <Token size="sm" color={row.result === 'ok' ? 'green' : 'red'} label={row.result} /> },
]

function AuditPanel() {
  const { data } = useSettings()
  return (
    <SettingsCard>
      <SettingsRow setting="audit" detail={<Table data={data.audit} columns={auditColumns} idKey="id" density="compact" />} />
    </SettingsCard>
  )
}

/** A destination rather than a value: one row with a button that goes there. */
function LinkPanel({ setting, href, label }: { setting: string; href: string; label: string }) {
  const { openPage } = useSettings()
  return (
    <SettingsCard>
      <SettingsRow setting={setting} control={<Button label={label} variant="secondary" size="sm" onClick={() => openPage(href)} />} />
    </SettingsCard>
  )
}

function PanelBody({ panel }: { panel: PaneId }) {
  switch (panel) {
    case 'account':
      return <AccountPanel />
    case 'appearance':
      return <AppearancePanel />
    case 'navigation':
      return <NavigationPanel />
    case 'time':
      return <TimePanel />
    case 'map':
      return <InvestigationPanel />
    case 'branding':
      return <BrandingPanel />
    case 'behavior':
      return <BehaviorPanel />
    case 'honeypot':
      return <HoneypotPanel />
    case 'users':
      return <UsersPanel />
    case 'services':
      return <ServicesPanel />
    case 'report-presets':
      return <LinkPanel setting="reportTemplates" href="/reports/library" label="Open the library" />
    case 'canarytokens':
      return <LinkPanel setting="canary" href="/canarytokens" label="Open canarytokens" />
    case 'elasticsearch':
      return <LinkPanel setting="eventSearch" href="/history" label="Open event search" />
    case 'dead-letters':
      return <LinkPanel setting="deadLetters" href="/dead-letters" label="Open dead letters" />
    case 'history':
      return <HistoryPanel />
    case 'audit':
      return <AuditPanel />
  }
}

// ---- Dialog ----------------------------------------------------------------------

export function SettingsDialog({ pane, onPane, onClose }: { pane: PaneId; onPane: (pane: PaneId) => void; onClose: () => void }) {
  const titleId = useId()
  const navigate = useNavigate()
  const isNarrow = useMediaQuery(NARROW_VIEWPORT)
  const [data, setData] = useState<SettingsData | null>(null)
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [dirtyPanels, setDirtyPanels] = useState<ReadonlySet<PaneId>>(new Set())
  // A navigation or close waiting on "discard unsaved changes?".
  const [pending, setPending] = useState<{ run: () => void; label: string } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const reload = useCallback(async () => {
    const next = await getSettings()
    setData(next)
    setPrefs((current) => current ?? next.preferences)
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const setDirty = useCallback((panel: PaneId, dirty: boolean) => {
    setDirtyPanels((prev) => {
      if (prev.has(panel) === dirty) return prev
      const next = new Set(prev)
      if (dirty) next.add(panel)
      else next.delete(panel)
      return next
    })
  }, [])

  // Personal settings apply as they change; a short debounce batches typing.
  const setPref = (patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...(current ?? data!.preferences), ...patch }
      clearTimeout(saveTimer.current)
      setSaveState('saving')
      saveTimer.current = setTimeout(() => {
        void savePreferences(next).then(() => setSaveState('saved'))
      }, 400)
      return next
    })
  }

  const guard = (run: () => void, label: string) => {
    if (dirtyPanels.size === 0) return run()
    setPending({ run, label })
  }
  const selectPanel = (panel: PaneId) => {
    search.setQuery('')
    if (panel === pane) return
    guard(() => onPane(panel), `Open ${panelOf(panel).label}`)
  }
  const requestClose = () => guard(onClose, 'Close settings')
  const openPage = (href: string) =>
    guard(() => {
      onClose()
      void navigate({ href })
    }, 'Leave settings')
  const search = useSettingsSearch((panel) => selectPanel(panel))

  const status =
    isAdminPanel(pane) || saveState === 'idle' ? undefined : (
      <Text type="supporting" color="secondary">
        {saveState === 'saving' ? 'Saving…' : 'Saved'}
      </Text>
    )
  const discardBanner = pending && (
    <Banner
      status="warning"
      title={`Unsaved changes in ${[...dirtyPanels].map((p) => panelOf(p).label).join(', ')}`}
      description="They are staged, not saved. Discard them, or go back and save."
      endContent={
        <HStack gap={2}>
          <Button label="Keep editing" size="sm" variant="ghost" onClick={() => setPending(null)} />
          <Button
            label={`Discard and ${pending.label.toLowerCase()}`}
            size="sm"
            onClick={() => {
              const { run } = pending
              setPending(null)
              setDirtyPanels(new Set())
              run()
            }}
          />
        </HStack>
      }
    />
  )
  const body = data && prefs && (
    <SettingsContext.Provider value={{ data, reload, prefs, setPref, setDirty, openPage }}>
      <PanelColumn>
        <HStack gap={2} vAlign="start">
          <StackItem size="fill">
            <SettingsPanelHeading panel={pane} status={status} />
          </StackItem>
          {/* Holds the column the pinned close floats over. */}
          <div aria-hidden style={{ width: 32 }} />
        </HStack>
        {discardBanner}
        <PanelBody key={pane} panel={pane} />
      </PanelColumn>
    </SettingsContext.Provider>
  )

  return (
    <Dialog isOpen onOpenChange={(open) => !open && requestClose()} purpose="form" width={1120} maxHeight={SHELL_HEIGHT} padding={0} aria-labelledby={titleId}>
      <VStack style={{ height: SHELL_HEIGHT }}>
        {isNarrow ? (
          <VStack gap={0} height="100%">
            <HStack gap={2} vAlign="center" paddingInline={3} paddingBlock={3}>
              <StackItem size="fill">
                <Text type="label" id={titleId}>
                  Settings
                </Text>
              </StackItem>
              <IconButton label="Close" variant="ghost" size="sm" icon={<Icon icon="close" size="sm" />} onClick={requestClose} />
            </HStack>
            <Divider />
            <VStack paddingInline={3} paddingBlock={2}>
              <SettingsSearchInput search={search} />
            </VStack>
            {search.isActive ? (
              <VStack paddingInline={3} isScrollable>
                <SettingsSearchResults search={search} onSelect={(setting) => selectPanel(setting.panel)} />
              </VStack>
            ) : (
              <>
                <SettingsPanelTabs active={pane} onSelect={selectPanel} />
                <Divider />
                <StackItem size="fill">
                  <VStack padding={4} isScrollable height="100%">
                    {body ?? <Skeleton height={320} />}
                  </VStack>
                </StackItem>
              </>
            )}
          </VStack>
        ) : (
          <Layout
            start={<SettingsSideNav titleId={titleId} search={search} active={pane} onSelect={selectPanel} />}
            content={
              <LayoutContent isScrollable padding={4}>
                <PinnedClose onClose={requestClose} />
                {body ?? <Skeleton height={320} />}
              </LayoutContent>
            }
          />
        )}
      </VStack>
    </Dialog>
  )
}

