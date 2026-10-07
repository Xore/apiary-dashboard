// Every production component module in the pinned canonical dashboard and
// the rewrite module(s) that own the same behavior. The inventory is frozen
// in docs/migration/canonical-components.txt; the parity test checks it.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type ComponentRow = {
  source: string
  destination: string[]
  status: 'implemented' | 'replaced'
  note: string
}

export const COMPONENT_ROWS: ComponentRow[] = [
  {
    source: 'components/AppShell.tsx',
    destination: ['src/components/ShellAppShell.tsx'],
    status: 'implemented',
    note: 'Astryx application shell and global hosts.',
  },
  {
    source: 'components/ArtifactList.tsx',
    destination: ['src/components/analyzers/ArtifactList.tsx'],
    status: 'implemented',
    note: 'Analysis artifact rows and downloads.',
  },
  {
    source: 'components/AttackerGraph.tsx',
    destination: ['src/components/AttackerGraph.tsx'],
    status: 'implemented',
    note: 'Attacker relationship graph.',
  },
  {
    source: 'components/CapturedMail.tsx',
    destination: ['src/components/CapturedMail.tsx'],
    status: 'implemented',
    note: 'Captured message detail.',
  },
  {
    source: 'components/CardIcons.tsx',
    destination: ['src/themes/neutral/icons.tsx'],
    status: 'replaced',
    note: 'Theme icon mapping replaces page-owned icon cards.',
  },
  {
    source: 'components/CommandPalette.tsx',
    destination: ['src/components/ShellAppShell.tsx'],
    status: 'implemented',
    note: 'Astryx CommandPalette hosted by the shell.',
  },
  {
    source: 'components/ConfirmDialog.tsx',
    destination: ['src/components/AppDialog.tsx'],
    status: 'implemented',
    note: 'Shared accessible confirmation dialog.',
  },
  {
    source: 'components/CuratedSensorViews.tsx',
    destination: ['src/routes/_layout/sensors.$sensor.tsx'],
    status: 'implemented',
    note: 'Sensor entity page and its child views.',
  },
  {
    source: 'components/EChart.tsx',
    destination: ['src/components/charts.tsx'],
    status: 'replaced',
    note: 'Typed Recharts compositions replace the ECharts wrapper.',
  },
  {
    source: 'components/ErrorState.tsx',
    destination: [
      'src/components/FeedState.tsx',
      'src/components/DefaultCatchBoundary.tsx',
    ],
    status: 'implemented',
    note: 'Inline feed failures and route failures.',
  },
  {
    source: 'components/EsHistoryConsole.tsx',
    destination: ['src/routes/_layout/history.tsx'],
    status: 'implemented',
    note: 'Server-paged history page.',
  },
  {
    source: 'components/FiltersModal.tsx',
    destination: [
      'src/components/FilterSelect.tsx',
      'src/components/RecordList.tsx',
    ],
    status: 'replaced',
    note: 'Route search parameters and list filter controls replace a global modal.',
  },
  {
    source: 'components/GhidraCallGraph.tsx',
    destination: ['src/components/analyzers/CallGraph.tsx'],
    status: 'implemented',
    note: 'Ghidra call graph.',
  },
  {
    source: 'components/Investigate.tsx',
    destination: [
      'src/components/IocLookup.tsx',
      'src/components/EntityLink.tsx',
    ],
    status: 'replaced',
    note: 'Lookup and typed entity links are separate owners.',
  },
  {
    source: 'components/LiveToasts.tsx',
    destination: ['src/components/LiveToasts.tsx'],
    status: 'implemented',
    note: 'Operational health notifications.',
  },
  {
    source: 'components/OverviewPanels.tsx',
    destination: [
      'src/components/DashboardBlocks.tsx',
      'src/components/charts.tsx',
    ],
    status: 'implemented',
    note: 'Overview blocks and charts.',
  },
  {
    source: 'components/ProblemReportButton.tsx',
    destination: ['src/components/ProblemReportButton.tsx'],
    status: 'implemented',
    note: 'Redacted problem capture and submission.',
  },
  {
    source: 'components/RowActions.tsx',
    destination: [
      'src/components/OpenInMenu.tsx',
      'src/components/useRowActivation.ts',
    ],
    status: 'replaced',
    note: 'Keyboard row activation and per-row navigation menu.',
  },
  {
    source: 'components/SensorEvents.tsx',
    destination: ['src/routes/_layout/sensors.$sensor.events.tsx'],
    status: 'implemented',
    note: 'Sensor event child route.',
  },
  {
    source: 'components/SettingsModal.tsx',
    destination: ['src/components/SettingsDialog.tsx'],
    status: 'implemented',
    note: 'Personal settings dialog; administration moved to /admin.',
  },
  {
    source: 'components/Sidebar.tsx',
    destination: ['src/components/ShellSideNav.tsx'],
    status: 'implemented',
    note: 'Astryx side navigation.',
  },
  {
    source: 'components/StoreList.tsx',
    destination: ['src/components/RecordList.tsx'],
    status: 'implemented',
    note: 'Dense, server-paged record rows.',
  },
  {
    source: 'components/Tabs.tsx',
    destination: ['src/components/ViewTabs.tsx'],
    status: 'implemented',
    note: 'Route-owned top navigation tabs.',
  },
  {
    source: 'components/ThemeGallery.tsx',
    destination: [
      'src/components/settings/parts.tsx',
      'src/themes/appTheme.ts',
    ],
    status: 'implemented',
    note: 'Theme previews and theme selection.',
  },
  {
    source: 'components/Topbar.tsx',
    destination: ['src/components/ShellTopNav.tsx'],
    status: 'implemented',
    note: 'Astryx top navigation.',
  },
]

export function renderComponentMatrix(
  rows: ComponentRow[] = COMPONENT_ROWS,
): string {
  const cell = (value: string) => value.replace(/\|/g, '\\|')
  const implemented = rows.filter((row) => row.status === 'implemented').length
  return [
    '# Component matrix',
    '',
    'Every production component module in the canonical dashboard (`Xore/APIARY@62ee45d`) and the rewrite module that owns the same behavior. The rewrite intentionally consolidates components where Astryx or a route owns the behavior.',
    '',
    `**${rows.length} components**: ${implemented} implemented directly, ${rows.length - implemented} replaced by a consolidated owner, 0 gaps.`,
    '',
    '| Canonical component | Rewrite owner | Status | Note |',
    '|---|---|---|---|',
    ...rows.map(
      (row) =>
        `| \`${cell(row.source)}\` | ${row.destination.map((path) => `\`${cell(path)}\``).join('<br>')} | ${row.status} | ${cell(row.note)} |`,
    ),
    '',
  ].join('\n')
}

if (import.meta.main) {
  writeFileSync(
    join(import.meta.dirname, '..', 'docs/migration/components.md'),
    renderComponentMatrix(),
  )
  console.log(
    `docs/migration/components.md: ${COMPONENT_ROWS.length} components`,
  )
}
