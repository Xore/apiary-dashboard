# Component matrix

Every production component module in the canonical dashboard (`Xore/APIARY@62ee45d`) and the rewrite module that owns the same behavior. The rewrite intentionally consolidates components where Astryx or a route owns the behavior.

**25 components**: 20 implemented directly, 5 replaced by a consolidated owner, 0 gaps.

| Canonical component | Rewrite owner | Status | Note |
|---|---|---|---|
| `components/AppShell.tsx` | `src/components/ShellAppShell.tsx` | implemented | Astryx application shell and global hosts. |
| `components/ArtifactList.tsx` | `src/components/analyzers/ArtifactList.tsx` | implemented | Analysis artifact rows and downloads. |
| `components/AttackerGraph.tsx` | `src/components/AttackerGraph.tsx` | implemented | Attacker relationship graph. |
| `components/CapturedMail.tsx` | `src/components/CapturedMail.tsx` | implemented | Captured message detail. |
| `components/CardIcons.tsx` | `src/themes/neutral/icons.tsx` | replaced | Theme icon mapping replaces page-owned icon cards. |
| `components/CommandPalette.tsx` | `src/components/ShellAppShell.tsx` | implemented | Astryx CommandPalette hosted by the shell. |
| `components/ConfirmDialog.tsx` | `src/components/AppDialog.tsx` | implemented | Shared accessible confirmation dialog. |
| `components/CuratedSensorViews.tsx` | `src/routes/_layout/sensors.$sensor.tsx` | implemented | Sensor entity page and its child views. |
| `components/EChart.tsx` | `src/components/charts.tsx` | replaced | Typed Recharts compositions replace the ECharts wrapper. |
| `components/ErrorState.tsx` | `src/components/FeedState.tsx`<br>`src/components/DefaultCatchBoundary.tsx` | implemented | Inline feed failures and route failures. |
| `components/EsHistoryConsole.tsx` | `src/routes/_layout/history.tsx` | implemented | Server-paged history page. |
| `components/FiltersModal.tsx` | `src/components/FilterSelect.tsx`<br>`src/components/RecordList.tsx` | replaced | Route search parameters and list filter controls replace a global modal. |
| `components/GhidraCallGraph.tsx` | `src/components/analyzers/CallGraph.tsx` | implemented | Ghidra call graph. |
| `components/Investigate.tsx` | `src/components/IocLookup.tsx`<br>`src/components/EntityLink.tsx` | replaced | Lookup and typed entity links are separate owners. |
| `components/LiveToasts.tsx` | `src/components/LiveToasts.tsx` | implemented | Operational health notifications. |
| `components/OverviewPanels.tsx` | `src/components/DashboardBlocks.tsx`<br>`src/components/charts.tsx` | implemented | Overview blocks and charts. |
| `components/ProblemReportButton.tsx` | `src/components/ProblemReportButton.tsx` | implemented | Redacted problem capture and submission. |
| `components/RowActions.tsx` | `src/components/OpenInMenu.tsx`<br>`src/components/useRowActivation.ts` | replaced | Keyboard row activation and per-row navigation menu. |
| `components/SensorEvents.tsx` | `src/routes/_layout/sensors.$sensor.events.tsx` | implemented | Sensor event child route. |
| `components/SettingsModal.tsx` | `src/components/SettingsDialog.tsx` | implemented | Personal settings dialog; administration moved to /admin. |
| `components/Sidebar.tsx` | `src/components/ShellSideNav.tsx` | implemented | Astryx side navigation. |
| `components/StoreList.tsx` | `src/components/RecordList.tsx` | implemented | Dense, server-paged record rows. |
| `components/Tabs.tsx` | `src/components/ViewTabs.tsx` | implemented | Route-owned top navigation tabs. |
| `components/ThemeGallery.tsx` | `src/components/settings/parts.tsx`<br>`src/themes/appTheme.ts` | implemented | Theme previews and theme selection. |
| `components/Topbar.tsx` | `src/components/ShellTopNav.tsx` | implemented | Astryx top navigation. |
