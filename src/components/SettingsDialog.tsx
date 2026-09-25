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
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
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
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ContainerStateLabel } from './FeedState'
import { CONTROL_WIDTH, PanelColumn, PinnedClose, SettingsCard, SettingsPanelHeading, SettingsPanelTabs, SettingsRow, SettingsSearchInput, SettingsSearchResults, SettingsSideNav, ThemeChoiceCards, useSettingsSearch } from './settings/parts'
import { isAdminPanel, panelOf } from './settings/registry'
import type { PaneId } from './settings/registry'
import { getSettings, rollbackConfig, runServiceAction, saveConfigSection, savePreferences, validateConfig } from '#/data/queries'
import type { AuditEntry, ConfigProblems, ConfigRevision, ConfigSection, DashboardConfig, EsStorage, Palette, Preferences, ServiceStatus, SettingsData } from '#/data/types'
import { formatDateTime, formatNumber } from '#/lib/format'
import { NAV_SECTIONS } from '#/lib/nav'
import { FieldStatus } from '@astryxdesign/core/FieldStatus'
import { ADMIN_REQUIRED, useIsAdmin } from '#/lib/session'
import { useGuardedAction } from '#/lib/useGuardedAction'

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

/** An admin section's staged form: dirty tracking, validation as you type
 * (the config store's persist-nothing preview), revert and save. */
function useStagedForm<TSection extends ConfigSection>(panel: PaneId, section: TSection) {
  const { data, reload, setDirty } = useSettings()
  const router = useRouter()
  const saved = data.config[section]
  const [form, setForm] = useState(saved)
  const [problems, setProblems] = useState<ConfigProblems>({})
  const [busy, setBusy] = useState(false)
  const { error, guard } = useGuardedAction()
  const isAdmin = useIsAdmin()
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  useEffect(() => setDirty(panel, dirty), [panel, dirty, setDirty])
  useEffect(() => () => setDirty(panel, false), [panel, setDirty])
  // Ask the store what it would refuse, a beat after typing stops.
  useEffect(() => {
    if (!dirty) {
      setProblems({})
      return
    }
    let live = true
    const timer = setTimeout(() => void validateConfig(section, form).then((p) => live && setProblems(p)).catch(() => {}), 300)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [section, form, dirty])
  const count = Object.keys(problems).length
  const set = (patch: Partial<DashboardConfig[TSection]>) => setForm((f) => ({ ...f, ...patch }))
  /** The field's validation message, as an input status. */
  const statusOf = (field: string) => (problems[field] ? { type: 'error' as const, message: problems[field] } : undefined)
  const actions = (
    <HStack gap={2} hAlign="end" vAlign="center">
      {error ? (
        <FieldStatus type="error" variant="detached" message={error} />
      ) : count > 0 ? (
        <FieldStatus type="error" variant="detached" message={count === 1 ? 'One field needs fixing before saving.' : `${count} fields need fixing before saving.`} />
      ) : (
        dirty && <Text type="supporting">Unsaved changes</Text>
      )}
      <Button label="Revert" variant="secondary" isDisabled={!dirty || !isAdmin} onClick={() => setForm(saved)} />
      <Button
        label="Save"
        isDisabled={!dirty || count > 0 || !isAdmin}
        tooltip={isAdmin ? undefined : ADMIN_REQUIRED}
        isLoading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await guard(async () => {
              const result = await saveConfigSection(section, form)
              // The shell renders with this config too: refresh it at once.
              if (result.ok) await Promise.all([reload(), router.invalidate()])
              else setProblems(result.problems)
            })
          } finally {
            setBusy(false)
          }
        }}
      />
    </HStack>
  )
  return { form, set, statusOf, actions }
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

const PALETTES: Array<{ value: Palette; label: string; color: string }> = [
  { value: 'claude', label: 'Claude', color: '#d97757' },
  { value: 'amber', label: 'Amber', color: '#d99a1e' },
  { value: 'lavender', label: 'Lavender', color: '#8c7ae6' },
  { value: 'lime', label: 'Lime', color: '#7cb518' },
  { value: 'neon', label: 'Neon', color: '#00c2a8' },
  { value: 'ocean', label: 'Ocean', color: '#1f78d1' },
  { value: 'rose', label: 'Rose', color: '#d6557d' },
  { value: 'slate', label: 'Slate', color: '#64748b' },
]

const swatch = (color: string) => <span aria-hidden style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 999, backgroundColor: color }} />

function AppearancePanel() {
  const { prefs, setPref } = useSettings()
  return (
    <>
      <SettingsCard title="Display">
        <SettingsRow setting="theme" detail={<ThemeChoiceCards value={prefs.theme} onChange={(theme) => setPref({ theme })} />} />
        <SettingsRow
          setting="palette"
          control={
            <Selector
              label="Accent palette"
              isLabelHidden
              width={CONTROL_WIDTH}
              value={prefs.palette}
              onChange={(palette) => setPref({ palette: palette as Palette })}
              options={PALETTES.map((p) => ({ value: p.value, label: p.label, icon: swatch(p.color) }))}
            />
          }
        />
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
      <SettingsCard title="Readability">
        <SettingsRow setting="highContrast" control={<Switch label="High contrast" isLabelHidden value={prefs.highContrast} onChange={(highContrast) => setPref({ highContrast })} />} />
        <SettingsRow setting="largeEvidenceText" control={<Switch label="Larger evidence text" isLabelHidden value={prefs.largeEvidenceText} onChange={(largeEvidenceText) => setPref({ largeEvidenceText })} />} />
        <SettingsRow setting="wrapLongValues" control={<Switch label="Wrap long values" isLabelHidden value={prefs.wrapLongValues} onChange={(wrapLongValues) => setPref({ wrapLongValues })} />} />
      </SettingsCard>
    </>
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
      <SettingsRow setting="rememberFilters" control={<Switch label="Remember filters" isLabelHidden value={prefs.rememberFilters} onChange={(rememberFilters) => setPref({ rememberFilters })} />} />
      <SettingsRow setting="collapsedSidebar" control={<Switch label="Start with the sidebar collapsed" isLabelHidden value={prefs.collapsedSidebar} onChange={(collapsedSidebar) => setPref({ collapsedSidebar })} />} />
    </SettingsCard>
  )
}

/** IANA zones worth a shortcut; the store accepts any valid zone. */
const TIMEZONES = ['browser', 'UTC', 'Europe/Berlin', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney']
const timezoneOption = (zone: string) => ({ value: zone, label: zone === 'browser' ? 'Browser time zone' : zone })

function TimePanel() {
  const { prefs, setPref } = useSettings()
  return (
    <>
      <SettingsCard title="Time">
        <SettingsRow setting="timezone" control={<Selector label="Time zone" isLabelHidden width={CONTROL_WIDTH} value={prefs.timezone} onChange={(timezone) => setPref({ timezone })} options={TIMEZONES.map(timezoneOption)} />} />
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
      </SettingsCard>
      <SettingsCard title="Live data">
        <SettingsRow setting="autoRefresh" control={<Switch label="Refresh automatically" isLabelHidden value={prefs.autoRefresh} onChange={(autoRefresh) => setPref({ autoRefresh })} />} />
        <SettingsRow
          setting="refresh"
          control={<Selector label="Refresh every" isLabelHidden width={CONTROL_WIDTH} isDisabled={!prefs.autoRefresh} value={String(prefs.refreshSeconds)} onChange={(v) => setPref({ refreshSeconds: Number(v) })} options={[10, 15, 30, 60, 120, 300].map((n) => ({ value: String(n), label: n < 60 ? `${n} seconds` : `${n / 60} minute${n === 60 ? '' : 's'}` }))} />}
        />
        <SettingsRow setting="liveToasts" control={<Switch label="Operational toasts" isLabelHidden value={prefs.liveToasts} onChange={(liveToasts) => setPref({ liveToasts })} />} />
        <SettingsRow
          setting="liveToastSeconds"
          control={<Selector label="At most one toast every" isLabelHidden width={CONTROL_WIDTH} isDisabled={!prefs.liveToasts} value={String(prefs.liveToastSeconds)} onChange={(v) => setPref({ liveToastSeconds: Number(v) })} options={[3, 30, 60, 120, 300, 900].map((n) => ({ value: String(n), label: n < 60 ? `${n} seconds` : `${n / 60} minute${n === 60 ? '' : 's'}` }))} />}
        />
      </SettingsCard>
      <SettingsCard title="Notifications">
        <SettingsRow
          setting="notifySeverity"
          control={
            <SegmentedControl label="Notify from" value={prefs.notifySeverity} onChange={(notifySeverity) => setPref({ notifySeverity: notifySeverity as Preferences['notifySeverity'] })}>
              <SegmentedControlItem value="low" label="Low" />
              <SegmentedControlItem value="medium" label="Medium" />
              <SegmentedControlItem value="high" label="High" />
              <SegmentedControlItem value="critical" label="Critical" />
            </SegmentedControl>
          }
        />
        <SettingsRow setting="notifyDesktop" control={<Switch label="Desktop notifications" isLabelHidden value={prefs.notifyDesktop} onChange={(notifyDesktop) => setPref({ notifyDesktop })} />} />
        <SettingsRow setting="notifySound" control={<Switch label="Sound" isLabelHidden value={prefs.notifySound} onChange={(notifySound) => setPref({ notifySound })} />} />
        <SettingsRow setting="notifyCanary" control={<Switch label="Canarytoken fires" isLabelHidden value={prefs.notifyCanary} onChange={(notifyCanary) => setPref({ notifyCanary })} />} />
      </SettingsCard>
    </>
  )
}

const WINDOW_OPTIONS = [
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

function InvestigationPanel() {
  const { prefs, setPref } = useSettings()
  return (
    <>
      <SettingsCard title="Investigations">
        <SettingsRow setting="defaultWindow" control={<Selector label="Default window" isLabelHidden width={CONTROL_WIDTH} value={prefs.defaultWindow} onChange={(defaultWindow) => setPref({ defaultWindow })} options={WINDOW_OPTIONS} />} />
      </SettingsCard>
      <SettingsCard title="Attack map">
        <SettingsRow setting="mapBasemap" control={<Selector label="Basemap" isLabelHidden width={CONTROL_WIDTH} value={prefs.mapBasemap} onChange={() => setPref({ mapBasemap: 'osm' })} options={[{ value: 'osm', label: 'OpenStreetMap' }]} />} />
        <SettingsRow setting="mapClustering" control={<Switch label="Cluster markers" isLabelHidden value={prefs.mapClustering} onChange={(mapClustering) => setPref({ mapClustering })} />} />
        <SettingsRow setting="mapAnimation" control={<Switch label="Map animation" isLabelHidden value={prefs.mapAnimation} onChange={(mapAnimation) => setPref({ mapAnimation })} />} />
      </SettingsCard>
    </>
  )
}

// ---- Administration panels (staged; affect everyone) -----------------------------

const BANNER_STATUS = { info: 'info', success: 'success', warning: 'warning', danger: 'error' } as const

function BrandingPanel() {
  const { form, set, statusOf, actions } = useStagedForm('branding', 'presentation')
  const text = (setting: string, field: keyof DashboardConfig['presentation'], label: string, placeholder?: string) => (
    <SettingsRow setting={setting} control={<TextInput label={label} isLabelHidden width={CONTROL_WIDTH} value={String(form[field])} placeholder={placeholder} status={statusOf(field)} onChange={(value) => set({ [field]: value })} />} />
  )
  return (
    <>
      <SettingsCard title="Identity">
        {text('appName', 'appName', 'Application name')}
        {text('productLabel', 'productLabel', 'Product label')}
        {text('orgName', 'orgName', 'Organization', 'None')}
      </SettingsCard>
      <SettingsCard title="Overview page">
        {text('dashboardTitle', 'dashboardTitle', 'Title')}
        {text('dashboardSubtitle', 'dashboardSubtitle', 'Subtitle', 'None')}
        {text('overviewIntro', 'overviewIntro', 'Intro', 'None')}
      </SettingsCard>
      <SettingsCard title="Banner">
        {text('bannerText', 'bannerText', 'Banner text', 'No banner')}
        <SettingsRow
          setting="bannerSeverity"
          control={
            <Selector
              label="Banner severity"
              isLabelHidden
              width={CONTROL_WIDTH}
              value={form.bannerSeverity}
              status={statusOf('bannerSeverity')}
              onChange={(value) => set({ bannerSeverity: value as DashboardConfig['presentation']['bannerSeverity'] })}
              options={[
                { value: '', label: 'None' },
                { value: 'info', label: 'Info' },
                { value: 'success', label: 'Success' },
                { value: 'warning', label: 'Warning' },
                { value: 'danger', label: 'Danger' },
              ]}
            />
          }
        />
        {text('bannerExpires', 'bannerExpires', 'Banner expires', '2026-10-01T18:00:00Z')}
        {form.bannerText && form.bannerSeverity && <Banner status={BANNER_STATUS[form.bannerSeverity]} title={form.bannerText} description="Preview: what every user sees at the top of every page." />}
      </SettingsCard>
      <SettingsCard title="Help and notices">
        {text('helpLinkLabel', 'helpLinkLabel', 'Help link label')}
        {text('helpUrl', 'helpLinkUrl', 'Help link', 'https://…')}
        {text('footer', 'footerText', 'Footer')}
        {text('aiDisclaimer', 'aiDisclaimer', 'AI disclaimer')}
        {text('privacyNotice', 'privacyNotice', 'Privacy notice')}
      </SettingsCard>
      {actions}
    </>
  )
}

const optionList = (values: number[]) => values.map(String)

function BehaviorPanel() {
  const { form, set, statusOf, actions } = useStagedForm('behavior', 'behavior')
  const choose = (setting: string, field: 'rowsPerPageOptions' | 'refreshIntervalOptions', label: string, all: number[], unit: string) => (
    <SettingsRow
      setting={setting}
      detail={
        <VStack gap={1}>
          <CheckboxList label={label} isLabelHidden value={optionList(form[field])} onChange={(values) => set({ [field]: values.map(Number).sort((a, b) => a - b) })}>
            {all.map((n) => (
              <CheckboxListItem key={n} value={String(n)} label={`${n}${unit}`} />
            ))}
          </CheckboxList>
          {statusOf(field) && <FieldStatus type="error" message={statusOf(field)!.message} />}
        </VStack>
      }
    />
  )
  return (
    <>
      <SettingsCard title="Defaults for every user">
        <SettingsRow
          setting="defaultLanding"
          control={<Selector label="Default landing page" isLabelHidden width={CONTROL_WIDTH} value={form.defaultLanding} status={statusOf('defaultLanding')} onChange={(defaultLanding) => set({ defaultLanding })} options={NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ value: i.to, label: i.label })))} />}
        />
        <SettingsRow setting="defaultTimeWindow" control={<Selector label="Default time window" isLabelHidden width={CONTROL_WIDTH} value={form.defaultTimeWindow} status={statusOf('defaultTimeWindow')} onChange={(defaultTimeWindow) => set({ defaultTimeWindow })} options={WINDOW_OPTIONS} />} />
        <SettingsRow setting="defaultTimezone" control={<Selector label="Default time zone" isLabelHidden width={CONTROL_WIDTH} value={form.defaultTimezone} status={statusOf('defaultTimezone')} onChange={(defaultTimezone) => set({ defaultTimezone })} options={TIMEZONES.map(timezoneOption)} />} />
        {choose('rowsPerPageOptions', 'rowsPerPageOptions', 'Rows per page choices', [10, 25, 50, 100], ' rows')}
        {choose('refreshIntervalOptions', 'refreshIntervalOptions', 'Refresh interval choices', [10, 15, 30, 60, 120, 300], ' s')}
      </SettingsCard>
      <SettingsCard title="Limits">
        <SettingsRow setting="maxExportRows" control={<NumberInput label="Export cap" isLabelHidden width={CONTROL_WIDTH} min={100} max={100_000} step={500} units="rows" value={form.maxExportRows} status={statusOf('maxExportRows')} onChange={(maxExportRows) => set({ maxExportRows })} />} />
        <SettingsRow setting="sourceStaleMinutes" control={<NumberInput label="Stale after" isLabelHidden width={CONTROL_WIDTH} min={1} max={1440} units="min" value={form.sourceStaleMinutes} status={statusOf('sourceStaleMinutes')} onChange={(sourceStaleMinutes) => set({ sourceStaleMinutes })} />} />
        <SettingsRow setting="mapProvider" control={<Selector label="Map provider" isLabelHidden width={CONTROL_WIDTH} value={form.mapProvider} onChange={() => set({ mapProvider: 'osm' })} options={[{ value: 'osm', label: 'OpenStreetMap' }]} />} />
      </SettingsCard>
      <SettingsCard title="Features">
        <SettingsRow setting="showMlPanels" control={<Switch label="ML panels" isLabelHidden value={form.showMlPanels} onChange={(showMlPanels) => set({ showMlPanels })} />} />
        <SettingsRow setting="showProblemReportButton" control={<Switch label="Report a problem button" isLabelHidden value={form.showProblemReportButton} onChange={(showProblemReportButton) => set({ showProblemReportButton })} />} />
        <SettingsRow setting="maintenanceMode" control={<Switch label="Maintenance mode" isLabelHidden value={form.maintenanceMode} onChange={(maintenanceMode) => set({ maintenanceMode })} />} />
        <SettingsRow setting="readOnly" control={<Switch label="Read only" isLabelHidden value={form.readOnly} onChange={(readOnly) => set({ readOnly })} />} />
      </SettingsCard>
      {actions}
    </>
  )
}

const mib = (bytes: number) => Math.round(bytes / 1024 ** 2)

function ReporterCard() {
  const { data } = useSettings()
  const { reporter } = data
  const stats = reporter.stats
  return (
    <SettingsCard title="Report sender">
      {!reporter.available || !stats ? (
        <SettingsRow setting="reporter" control={<Text type="supporting">{reporter.reason ?? 'No reporter metrics indexed yet.'}</Text>} />
      ) : (
        <SettingsRow
          setting="reporter"
          detail={
            <VStack gap={2}>
              <HStack gap={5} wrap="wrap">
                {(
                  [
                    ['Attempted', stats.attempted],
                    ['Sent', stats.sent],
                    ['Suppressed (cooldown)', stats.suppressedCooldown],
                    ['Dry run', stats.dryRun],
                    ['Failed', stats.failed],
                  ] as const
                ).map(([label, value]) => (
                  <VStack key={label} gap={0}>
                    {label === 'Failed' && value > 0 ? <Token size="sm" color="red" label={formatNumber(value)} /> : <Text weight="semibold">{formatNumber(value)}</Text>}
                    <Text type="supporting" color="secondary">
                      {label}
                    </Text>
                  </VStack>
                ))}
              </HStack>
              <Text type="supporting">{`As the sender last published them, ${formatDateTime(stats.updatedAt)}.`}</Text>
            </VStack>
          }
        />
      )}
    </SettingsCard>
  )
}

function HoneypotPanel() {
  const { form, set, statusOf, actions } = useStagedForm('honeypot', 'honeypot')
  const number = (setting: string, field: keyof DashboardConfig['honeypot'], label: string, props: { min: number; max: number; step?: number; units?: string }) => (
    <SettingsRow setting={setting} control={<NumberInput label={label} isLabelHidden width={CONTROL_WIDTH} {...props} value={Number(form[field])} status={statusOf(field)} onChange={(value) => set({ [field]: value })} />} />
  )
  return (
    <>
      <ReporterCard />
      <SettingsCard title="Alerting">
        <SettingsRow setting="alertCooldown" control={<TextInput label="Alert cooldown" isLabelHidden width={CONTROL_WIDTH} value={form.alertCooldown} placeholder="30m" status={statusOf('alertCooldown')} onChange={(alertCooldown) => set({ alertCooldown })} />} />
        {number('alertCampaignScore', 'alertCampaignScore', 'Campaign alert score', { min: 0, max: 100 })}
        {number('sandboxAlertRiskScore', 'sandboxAlertRiskScore', 'Sandbox alert risk', { min: 0, max: 100 })}
        {number('mlAlertThreshold', 'mlAlertThreshold', 'ML alert threshold', { min: 0, max: 1, step: 0.01 })}
      </SettingsCard>
      <SettingsCard title="Scanners">
        {number('yaraScanIntervalSeconds', 'yaraScanIntervalSeconds', 'YARA scan interval', { min: 60, max: 86_400, step: 60, units: 's' })}
        <SettingsRow
          setting="yaraMaxBytes"
          control={<NumberInput label="YARA size cap" isLabelHidden width={CONTROL_WIDTH} min={1} max={1024} units="MiB" value={mib(form.yaraMaxBytes)} status={statusOf('yaraMaxBytes')} onChange={(value) => set({ yaraMaxBytes: value * 1024 ** 2 })} />}
        />
        {number('payloadDedupeIntervalSeconds', 'payloadDedupeIntervalSeconds', 'Payload dedupe interval', { min: 60, max: 86_400, step: 60, units: 's' })}
      </SettingsCard>
      <Text type="supporting">Saved values are staged. They apply on the next operator-run restart of the affected service.</Text>
      {actions}
    </>
  )
}

function ReportPresetsPanel() {
  const { data, openPage } = useSettings()
  const { form, set, statusOf, actions } = useStagedForm('report-presets', 'reportPresets')
  const edit = (id: string, patch: { name?: string; description?: string }) => {
    const next = { ...form[id], ...patch }
    const rest = Object.fromEntries(Object.entries(form).filter(([key]) => key !== id))
    // An override with nothing in it is no override: the compiled text applies.
    set(next.name || next.description ? { ...rest, [id]: next } : rest)
  }
  return (
    <>
      {data.reportTemplates.map((template) => (
        <SettingsCard key={template.id} title={template.name}>
          <SettingsRow setting="presetName" control={<TextInput label={`${template.name}: name`} isLabelHidden width={CONTROL_WIDTH} value={form[template.id]?.name ?? ''} placeholder={template.name} status={statusOf(`${template.id}.name`)} onChange={(name) => edit(template.id, { name })} />} />
          <SettingsRow setting="presetDescription" control={<TextInput label={`${template.name}: description`} isLabelHidden width={CONTROL_WIDTH} value={form[template.id]?.description ?? ''} placeholder={template.description} status={statusOf(`${template.id}.description`)} onChange={(description) => edit(template.id, { description })} />} />
        </SettingsCard>
      ))}
      <HStack gap={2} hAlign="between" vAlign="center">
        <Button label="Open the report library" variant="ghost" size="sm" onClick={() => openPage('/reports/library')} />
        {actions}
      </HStack>
    </>
  )
}

const bytesHuman = (bytes: number) =>
  bytes >= 1024 ** 4 ? `${(bytes / 1024 ** 4).toFixed(1)} TiB` : bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GiB` : `${(bytes / 1024 ** 2).toFixed(1)} MiB`

const CLUSTER_COLOR = { green: 'green', yellow: 'orange', red: 'red' } as const

function StoragePanel() {
  const { data, openPage } = useSettings()
  const { storage } = data
  const columns: TableColumn<EsStorage['families'][number] & { id: string }>[] = [
    { key: 'family', header: 'Index family', width: proportional(2), renderCell: (row) => <Text type="code">{row.family}</Text> },
    { key: 'indices', header: 'Indices', width: pixel(80), align: 'end', renderCell: (row) => formatNumber(row.indices) },
    { key: 'docs', header: 'Documents', width: pixel(128), align: 'end', renderCell: (row) => formatNumber(row.docs) },
    { key: 'bytes', header: 'Size', width: pixel(96), align: 'end', renderCell: (row) => bytesHuman(row.bytes) },
  ]
  return (
    <>
      <SettingsCard title="Storage">
        <SettingsRow setting="clusterStatus" control={<Token size="sm" color={CLUSTER_COLOR[storage.clusterStatus]} label={storage.clusterStatus} />} />
        <SettingsRow setting="storageTotals" control={<Text>{`${formatNumber(storage.indexCount)} indices · ${formatNumber(storage.docCount)} documents · ${bytesHuman(storage.storeBytes)}`}</Text>} />
        <SettingsRow setting="storageFamilies" detail={<Table data={storage.families.map((f) => ({ ...f, id: f.family }))} columns={columns} idKey="id" density="compact" />} />
      </SettingsCard>
      <SettingsCard>
        <SettingsRow setting="eventSearch" control={<Button label="Open event search" variant="secondary" size="sm" onClick={() => openPage('/history')} />} />
      </SettingsCard>
    </>
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
  const { error, guard } = useGuardedAction()
  const isAdmin = useIsAdmin()
  const act = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setBusy(name)
    try {
      await guard(async () => {
        await runServiceAction(name, action)
        await reload()
      })
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
            <Button label="Start" size="sm" isLoading={busy === row.name} isDisabled={!isAdmin} onClick={() => act(row.name, 'start')} />
          ) : (
            <>
              <Button label="Restart" size="sm" variant="secondary" isLoading={busy === row.name} isDisabled={!isAdmin} onClick={() => act(row.name, 'restart')} />
              <Button label="Stop" size="sm" variant="ghost" isDisabled={busy === row.name || !isAdmin} onClick={() => act(row.name, 'stop')} />
            </>
          )}
        </HStack>
      ),
    },
  ]
  return (
    <>
      {error && <Banner status="error" title="Not done" description={error} />}
      <SettingsCard>
      <SettingsRow setting="services" detail={<Table data={data.services} columns={columns} idKey="name" density="compact" />} />
    </SettingsCard>
    </>
  )
}

function HistoryPanel() {
  const router = useRouter()
  const { data, reload } = useSettings()
  const [target, setTarget] = useState<ConfigRevision | null>(null)
  const [busy, setBusy] = useState(false)
  const { error, guard } = useGuardedAction()
  const isAdmin = useIsAdmin()
  const columns: TableColumn<ConfigRevision>[] = [
    { key: 'at', header: 'When', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.at)}</Text> },
    { key: 'section', header: 'Section', width: pixel(136), renderCell: (row) => <Token size="sm" label={row.section} /> },
    { key: 'summary', header: 'Change', width: proportional(2) },
    { key: 'actor', header: 'By', width: pixel(96) },
    { key: 'id', header: '', width: pixel(112), renderCell: (row) => <Button label="Roll back" size="sm" variant="secondary" isDisabled={!isAdmin} onClick={() => setTarget(row)} /> },
  ]
  return (
    <>
      {error && <Banner status="error" title="Not done" description={error} />}
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
                          await guard(async () => {
                            await rollbackConfig(target.id)
                            await Promise.all([reload(), router.invalidate()])
                          })
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
      return <ReportPresetsPanel />
    case 'canarytokens':
      return <LinkPanel setting="canary" href="/canarytokens" label="Open canarytokens" />
    case 'elasticsearch':
      return <StoragePanel />
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
  // Administration panels are visible to every role and editable by admins.
  const isAdmin = useIsAdmin()
  const readOnly = isAdminPanel(pane) && !isAdmin
  const isNarrow = useMediaQuery(NARROW_VIEWPORT)
  const [data, setData] = useState<SettingsData | null>(null)
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
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
        void savePreferences(next)
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('failed'))
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
        {saveState === 'saving' ? 'Saving…' : saveState === 'failed' ? 'Not saved: the backend did not answer' : 'Saved'}
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
        {readOnly && <Banner status="info" title="Read only" description="Changing administration settings needs the admin role. You can see them; ask an admin to change them." />}
        {/* A disabled fieldset disables every control inside it at once. */}
        <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <VStack gap={4}>
            <PanelBody key={pane} panel={pane} />
          </VStack>
        </fieldset>
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

