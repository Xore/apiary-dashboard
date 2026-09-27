# Routes: data, mutations and states

Every page route of the canonical dashboard (`Xore/APIARY@62ee45d`): the data it reads, the mutations it can make, and the user-visible states its source handles, counting the components it imports. Built by `scripts/inventory/routes.ts` from `server-functions.json` and the source. Data: `routes.json`. Direct handlers and auth routes are in `route-matrix.md`.

**45 page routes**, 113 reads and 37 mutations (a function used by several routes counts in each).

## `agent-campaigns.tsx`

Slice: #74

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/StoreList.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/agent-campaigns.tsx#fetchPage` → StorePage&lt;AgentCampaignRow> \| null — `total`, `rows[].@timestamp`, `rows[].campaign_id`, `rows[].start`, `rows[].end`, `rows[].severity`, `rows[].matched_categories`, `rows[].correlation_identifiers`, `rows[].event_count`, `rows[].events[].event_id`, `rows[].events[].source_index`, `rows[].events[].timestamp`, `rows[].events[].matched_rules`
- direct handlers: `/api/v1/store/agent-campaigns`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `alerts.tsx`

Slice: #77

Carries: `components/ConfirmDialog.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/Tabs.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/alerts.tsx#fetchAlerts` (loader) → BoardFetch — `rows[].Key`, `rows[].Message`, `rows[].Link`, `rows[].FirstSeen`, `rows[].LastSeen`, `rows[].LastNotified`, `rows[].Count`, `rows[].Acknowledged`, `complete`
- direct handlers: `/api/v1/alerts`, `/api/v1/alerts/{…}/ack`

**Mutations**

- `routes/alerts.tsx#acknowledgeAlert` (session+) → `POST /api/v1/alerts/{key}/ack`
- `routes/alerts.tsx#acknowledgeAll` (session+) → `GET /api/v1/alerts?offset={offset}&size=100`, `POST /api/v1/alerts/{key}/ack`
- `routes/alerts.tsx#acknowledgeKeys` (session+) → `POST /api/v1/alerts/{key}/ack`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, paging (view more / offset)

**Empty/hint text:** “The backend request failed — an outage looks like silence here, so it names itself instead.”

## `attackers.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/EChart.tsx`, `components/AttackerGraph.tsx`, `components/ErrorState.tsx`, `components/Tabs.tsx`, `components/RowActions.tsx`

**Reads**

- `components/AttackerGraph.tsx#fetchGraph` → Graph \| null — `nodes[].id`, `nodes[].label`, `nodes[].kind`, `edges[].source`, `edges[].target`
- `routes/attackers.tsx#fetchAttackers` (loader) → Page \| null — `total`, `rows[].id`, `rows[].ips`, `rows[].fingerprints`, `rows[].payloads`, `rows[].credentials`, `rows[].sensors`, `rows[].events`, `rows[].first`, `rows[].last`, `rows[].updated`, `rows[].verdicts`, `rows[].techniques`, `rows[].scan`, `rows[].dest_ips`, `rows[].ports_touched`
- direct handlers: `/api/chart/attacker-fusion`, `/api/v1/attackers`, `/api/v1/attackers-graph`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, copy feedback, paging (view more / offset)

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `auth-events.tsx`

Slice: #74

Carries: `components/StoreList.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/auth-events.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- `routes/auth-events.tsx#fetchStatsWindow` → StorePage \| null — `total`, `rows`
- direct handlers: `/api/v1/store/auth-events`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

## `campaigns.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/campaigns.tsx#fetchCampaigns` (loader) → { total: number; rows: CampaignRow[]; } \| null — `total`, `rows[].cidr`, `rows[].score`, `rows[].events`, `rows[].unique_ips`, `rows[].sensors`, `rows[].ports`, `rows[].creds`, `rows[].payloads`, `rows[].alerts`, `rows[].providers`, `rows[].fingerprints`, `rows[].explanation`, `rows[].first`, `rows[].last`, `rows[].asns`, … 5 more
- `routes/campaigns.tsx#fetchCredReuse` (loader) → CredEdge[] \| null — `[].user`, `[].pass`, `[].unique_ips`, `[].ips`, `[].sensors`, `[].events`, `[].first`, `[].last`
- direct handlers: `/api/export/campaigns.csv`, `/api/v1/campaigns`, `/api/v1/cred-reuse`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `canarytokens.tsx`

Slice: #80

Carries: `components/StoreList.tsx`, `components/Investigate.tsx`, `components/Tabs.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/canarytokens.tsx#fetchFired` → FiredPage \| null — `total`, `rows[].time`, `rows[].src_ip`, `rows[].country`, `rows[].detail`, `rows[].record`
- `routes/canarytokens.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- `routes/canarytokens.tsx#fetchTypes` → TokenType[] \| null — `[].token_type`, `[].label`, `[].description`, `[].requires_upload`, `[].supports_snippet`
- direct handlers: `/api/canarytoken/${encodeURIComponent(str(row,`, `/api/v1/canarytokens`, `/api/v1/canarytokens/types`, `/api/v1/events`, `/api/v1/store/canarytokens`

**Mutations**

- `routes/canarytokens.tsx#createToken` (session+) → `POST /api/v1/canarytokens`

**States:** loading skeleton, error with retry, empty state, copy feedback, paging (view more / offset), live refresh, download or export

## `cape.$sha.tsx`

Slice: #78

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/cape.$sha.tsx#fetchRun` (loader) → RunFetch — `state`, `run.sha256`, `run.requested_at`, `run.started_at`, `run.completed_at`, `run.exit_status`, `run.error`, `run.task_id`, `run.cape_status`, `run.route`, `run.score`, `run.category`, `run.signatures[].name`, `run.signatures[].description`, `run.signatures[].severity`, `run.report_summary.machine`, … 14 more
- direct handlers: `/api/raw-report/cape/{…}`, `/api/v1/cape/{…}`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether a run exists for this hash.”

## `cape.index.tsx`

Slice: #78

Carries: `components/StoreList.tsx`, `components/Investigate.tsx`, `components/CardIcons.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/cape.index.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- direct handlers: `/api/v1/store/cape`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

## `clusters.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/clusters.tsx#fetchClusters` (loader) → Page \| null — `total`, `rows[].kind`, `rows[].value`, `rows[].sources`, `rows[].events`, `rows[].sensors`, `rows[].generated`
- direct handlers: `/api/export/clusters.csv`, `/api/v1/clusters`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `commands.tsx`

Slice: #75

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/commands.tsx#fetchCommands` (loader) → Page \| null — `total`, `offset`, `rows[].time`, `rows[].sensor`, `rows[].src_ip`, `rows[].country`, `rows[].port`, `rows[].proto`, `rows[].detail`, `rows[].session`, `rows[].record`
- direct handlers: `/api/export/commands.csv`, `/api/v1/events`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `credentials.tsx`

Slice: #80

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/StoreList.tsx`, `components/RowActions.tsx`

**Reads**

- `lib/auth.ts#getSessionUser` (loader) → User \| null — `sub`, `username`, `displayName`, `role`
- `routes/credentials.tsx#fetchCredentials` → CredentialsResponse \| null — `available`, `error`, `credentials[].id`, `credentials[].target`, `credentials[].path`, `credentials[].username`, `credentials[].password`, `credentials[].content_template`, `credentials[].memo`, `credentials[].linked_token_id`, `credentials[].created_by`, `credentials[].created_at`, `credentials[].rotated_by`, `credentials[].rotated_at`
- `routes/credentials.tsx#fetchLinkableTokens` → TokenRecord[] — `[].id`, `[].token_type`, `[].memo`
- direct handlers: `/api/v1/canarytokens`, `/api/v1/credentials`, `/api/v1/credentials/{…}/link-token`, `/api/v1/credentials/{…}/rotate`

**Mutations**

- `routes/credentials.tsx#createCredential` (admin) → `POST /api/v1/credentials`
- `routes/credentials.tsx#linkCredentialToken` (admin) → `POST /api/v1/credentials/{id}/link-token`
- `routes/credentials.tsx#rotateCredential` (admin) → `POST /api/v1/credentials/{id}/rotate`

**States:** loading skeleton, error with retry, empty state, admin-only controls, paging (view more / offset)

**Empty/hint text:** “The backend request failed — provisioned bait itself is untouched; this page just can't list it right now.”

## `dead-letters.tsx`

Slice: #77

Carries: `components/ConfirmDialog.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/StoreList.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/dead-letters.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- direct handlers: `/api/v1/store/dead-letters`

**Mutations**

- `routes/dead-letters.tsx#purgeDeadLetters` (admin) → `DELETE /api/v1/store/dead-letters?{query}`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset)

**Empty/hint text:** “The store read failed — nothing here is cached.”

## `event.$id.tsx`

Slice: #75

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/event.$id.tsx#fetchEvent` (loader) → EventFetch — `state`, `event.id`, `event.index`, `event.time`, `event.sensor`, `event.src_ip`, `event.session`, `event.community_id`, `event.hashes`, `event.record`, `event.session_events.key`, `event.session_events.total`, `event.session_events.rows`, `event.flow_events.key`, `event.flow_events.total`, `event.flow_events.rows`, … 13 more
- direct handlers: `/api/v1/event/{…}`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, copy feedback, paging (view more / offset)

**Empty/hint text:** “The backend request failed — this says nothing about whether the event exists.”; “Every event sharing session”; “Every sensor that saw the flow”; “Last 24 hours from”

## `events.tsx`

Slice: #75

Carries: `components/ErrorState.tsx`, `components/FiltersModal.tsx`, `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/events.tsx#fetchEvents` (loader) → EventsPage \| null — `total`, `offset`, `rows[].src_ip_claimed`, `rows[].id`, `rows[].time`, `rows[].sensor`, `rows[].src_ip`, `rows[].country`, `rows[].port`, `rows[].proto`, `rows[].detail`, `rows[].session`, `rows[].pivots.persona`, `rows[].pivots.site`, `rows[].pivots.asset`, `rows[].pivots.fingerprint`, … 18 more
- `routes/events.tsx#fetchFilterValues` → FilterValues \| null — `sensors`, `countries`, `cities`, `protos`, `ports`, `kinds`
- `routes/events.tsx#fetchInvestigationConfig` (loader) → InvestigationConfig — `kibana`, `evebox`, `arkime`
- direct handlers: `/api/export/events.csv`, `/api/recording/{…}/cast`, `/api/recording/{…}/raw`, `/api/v1/events`, `/api/v1/filter-values`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, copy feedback, paging (view more / offset), live refresh, download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether events exist in the window.”

## `ghidra.$sha.tsx`

Slice: #78

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/ArtifactList.tsx`, `components/GhidraCallGraph.tsx`, `components/ConfirmDialog.tsx`, `components/RowActions.tsx`

**Reads**

- `components/ArtifactList.tsx#fetchArtifacts` → { rows: ArtifactRow[] } \| null — `rows[].filename`, `rows[].kind`, `rows[].content_type`, `rows[].size_bytes`, `rows[].imported_at`
- `components/GhidraCallGraph.tsx#fetchCallGraph` → Graph \| null — `nodes[].id`, `nodes[].label`, `nodes[].kind`, `edges[].source`, `edges[].target`, `truncated`
- `routes/ghidra.$sha.tsx#fetchRun` (loader) → RunFetch — `state`, `run`
- direct handlers: `/api/artifact/ghidra/{…}/{…}`, `/api/artifact/{…}/{…}/{…}`, `/api/v1/artifacts/{…}/{…}`, `/api/v1/ghidra-callgraph/{…}`, `/api/v1/ghidra/submit`, `/api/v1/ghidra/{…}`

**Mutations**

- `routes/ghidra.$sha.tsx#submitReanalysis` (admin) → `POST /api/v1/ghidra/submit (mounted)`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether an analysis exists for this hash.”

## `github-analysis.$sha.tsx`

Slice: #78

Carries: `components/ConfirmDialog.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/github-analysis.$sha.tsx#fetchRun` (loader) → RunFetch — `state`, `run.sha256`, `run.requested_at`, `run.started_at`, `run.completed_at`, `run.exit_status`, `run.reason`, `run.daily_cap`, `run.error`, `run.commit`, `run.report_commit`, `run.run_id`, `run.run_url`, `run.sample_path`, `run.family`, `run.verdict.malicious`, … 14 more
- direct handlers: `/api/raw-report/github-analysis/{…}`, `/api/v1/github-analysis/submit`, `/api/v1/github-analysis/{…}`

**Mutations**

- `routes/github-analysis.$sha.tsx#resubmitAnalysis` (admin) → `POST /api/v1/github-analysis/submit (mounted)`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether a publication exists for this hash.”

## `github-analysis.index.tsx`

Slice: #78

Carries: `components/StoreList.tsx`, `components/Investigate.tsx`, `components/CardIcons.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/github-analysis.index.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- direct handlers: `/api/v1/store/github-analysis`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

## `history.tsx`

Slice: #75

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/history.tsx#fetchHistory` (loader) → Page \| null — `total`, `offset`, `rows[].time`, `rows[].sensor`, `rows[].src_ip`, `rows[].country`, `rows[].port`, `rows[].proto`, `rows[].detail`, `rows[].session`, `rows[].record`
- direct handlers: `/api/export/history.json${activeQuery.current`, `/api/v1/events`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), download or export

**Empty/hint text:** “The search request failed — results are never cached here.”

## `index.tsx`

Slice: #74

Carries: `components/OverviewPanels.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`, `components/EChart.tsx`

**Reads**

- `components/OverviewPanels.tsx#fetchVectors` → Vectors \| null — `sensor`, `ports[].key`, `ports[].count`, `ports[].link`, `protocols[].key`, `protocols[].count`, `protocols[].link`
- `routes/index.tsx#fetchCampaignsSummary` (loader) → { total: number; rows: StoreRow[]; } \| null — `total`, `rows`
- `routes/index.tsx#fetchDashboard` (loader) → Dashboard \| null — `protocols[].key`, `protocols[].count`, `protocols[].link`, `top_ports[].key`, `top_ports[].count`, `top_ports[].link`, `countries[].key`, `countries[].count`, `countries[].link`, `asns[].key`, `asns[].count`, `asns[].link`, `providers[].key`, `providers[].count`, `providers[].link`, `top_ips[].key`, … 44 more
- `routes/index.tsx#fetchKpis` (loader) → OverviewKpis \| null — `total`, `last24h`, `previous24h`, `change24h`, `unique_ips`, `hourly`, `logins`, `ready`
- `routes/index.tsx#fetchPayloadsSummary` (loader) → { total: number; rows: StoreRow[]; } \| null — `total`, `rows`
- `routes/index.tsx#fetchPresentation` (loader) → Presentation \| null — `dashboard_title`, `dashboard_subtitle`, `footer_text`, `banner_text`, `banner_severity`
- `routes/index.tsx#fetchRecent` (loader) → { total: number; rows: EventRow[]; } \| null — `total`, `rows[].id`, `rows[].time`, `rows[].sensor`, `rows[].src_ip`, `rows[].country`, `rows[].port`, `rows[].detail`, `rows[].proto`, `rows[].session`, `rows[].record`
- direct handlers: `/api/chart/anomaly-trend`, `/api/chart/decoy-client-fingerprints`, `/api/chart/decoy-requests`, `/api/chart/dionaea-cves`, `/api/chart/endlessh-held-histogram`, `/api/chart/ics-functions`, `/api/chart/ja4h-fingerprints`, `/api/chart/ja4l-fingerprints`, `/api/chart/ja4x-fingerprints`, `/api/chart/ml-backlog`, `/api/chart/netflow-bytes`, `/api/chart/netflow-packets`, `/api/chart/os-distribution`, `/api/chart/ssh-fingerprints`, `/api/chart/tcp-stack-clusters`, `/api/chart/tls-fingerprints`, `/api/v1/attack-vectors`, `/api/v1/campaigns`, `/api/v1/config`, `/api/v1/events`, `/api/v1/overview/dashboard{…}`, `/api/v1/overview/kpis`, `/api/v1/payloads`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, copy feedback, live refresh

**Empty/hint text:** “The backend request failed — this panel is never cached.”; “authentication events only”; “No shell commands captured yet — fed by cowrie and multipot sessions.”; “No client banners yet — fed by cowrie.”; “No protocol or client fingerprints captured yet.”; “No web probes yet — fed by http-honeypot and tanner.”

## `investigate.cidr.$cidr.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/investigate.cidr.$cidr.tsx#fetchCorrelation` (loader) → CidrCorrelation \| null — `cidr`, `correlation.total`, `correlation.truncated`, `correlation.sensors[].key`, `correlation.sensors[].count`, `correlation.tunnel_connections`, `correlation.tunnel_os_guesses`, `correlation.records[].time`, `correlation.records[].sensor`, `correlation.records[].src_ip`, `correlation.records[].country`, `correlation.records[].port`, `correlation.records[].proto`, `correlation.records[].detail`, `correlation.records[].session`, `correlation.records[].record`
- direct handlers: `/api/v1/investigate/cidr/{…}`

**Mutations**

- none

**States:** loading skeleton, empty state, paging (view more / offset)

## `investigate.cluster.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/investigate.cluster.tsx#fetchCorrelation` (loader) → ClusterCorrelation \| null — `kind`, `value`, `ip_count`, `correlation.total`, `correlation.truncated`, `correlation.sensors[].key`, `correlation.sensors[].count`, `correlation.tunnel_connections`, `correlation.tunnel_os_guesses`, `correlation.records[].time`, `correlation.records[].sensor`, `correlation.records[].src_ip`, `correlation.records[].country`, `correlation.records[].port`, `correlation.records[].proto`, `correlation.records[].detail`, … 2 more
- direct handlers: `/api/v1/investigate/cluster`

**Mutations**

- none

**States:** loading skeleton, empty state, paging (view more / offset)

## `investigate.ip.$ip.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/Tabs.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/investigate.ip.$ip.tsx#fetchBlockState` → BlockState \| null — `IP`, `Blocked`, `Active`, `BlockedBy`, `ExpiresAt`
- `routes/investigate.ip.$ip.tsx#fetchProfile` (loader) → ProfileFetch — `state`, `profile.ip`, `profile.total`, `profile.first`, `profile.last`, `profile.country`, `profile.asn`, `profile.sensors[].key`, `profile.sensors[].count`, `profile.ports[].key`, `profile.ports[].count`, `profile.protos[].key`, `profile.protos[].count`, `profile.credentials[].key`, `profile.credentials[].count`, `profile.commands[].key`, … 33 more
- direct handlers: `/api/export/events.csv`, `/api/v1/investigate/ip/{…}`, `/api/v1/ip-block`, `/api/v1/ip-block/{…}`

**Mutations**

- `routes/investigate.ip.$ip.tsx#setBlock` (admin) → `POST /api/v1/ip-block`

**States:** loading skeleton, error with retry, empty state, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether the address has history. Do not treat it as an empty profile.”

## `investigate.lookup.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/investigate.lookup.tsx#resolveHashKind` → HashKindFetch — `state`, `kind`
- direct handlers: `/api/v1/investigate/cluster`

**Mutations**

- none

**States:** loading skeleton, empty state, paging (view more / offset)

## `ips.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/OverviewPanels.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `components/OverviewPanels.tsx#fetchVectors` → Vectors \| null — `sensor`, `ports[].key`, `ports[].count`, `ports[].link`, `protocols[].key`, `protocols[].count`, `protocols[].link`
- `routes/ips.tsx#fetchMapPoints` (loader) → MapPoint[] \| null — `[].city`, `[].country`, `[].lat`, `[].lon`, `[].events`, `[].ips`, `[].url`
- `routes/ips.tsx#fetchSources` (loader) → SourcesPage \| null — `total_unique`, `rows[].ip`, `rows[].country`, `rows[].events`, `rows[].logins`, `rows[].sessions`, `rows[].sensors`, `rows[].first`, `rows[].last`
- direct handlers: `/api/export/ips.csv`, `/api/v1/attack-vectors`, `/api/v1/overview/dashboard`, `/api/v1/sources`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `kill-chain.tsx`

Slice: #76

Carries: `components/Investigate.tsx`, `components/EChart.tsx`, `components/RowActions.tsx`

**Reads**

- direct handlers: `/api/chart/attck-coverage`, `/api/chart/campaign-timeline`, `/api/chart/kill-chain-sankey`

**Mutations**

- none

**States:** loading skeleton, empty state, copy feedback, paging (view more / offset)

## `llm-analysis.tsx`

Slice: #74

Carries: `components/StoreList.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/llm-analysis.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- `routes/llm-analysis.tsx#semanticSearch` → SemanticResult \| null — `available`, `reason`, `hits`
- direct handlers: `/api/v1/llm-search`, `/api/v1/store/llm-analysis`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

## `ml-anomalies.tsx`

Slice: #74

Carries: `components/StoreList.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/ConfirmDialog.tsx`, `components/EChart.tsx`, `components/FiltersModal.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/ml-anomalies.tsx#fetchAcks` → Record&lt;string, AckRecord> \| null
- `routes/ml-anomalies.tsx#fetchBacklog` → Backlog \| null — `total`, `open`
- `routes/ml-anomalies.tsx#fetchModelHealth` → ModelHealth[] \| null — `[].model`, `[].timestamp`, `[].accepted`, `[].reason`, `[].anomaly_rate_new`, `[].anomaly_rate_previous`, `[].train_samples`
- `routes/ml-anomalies.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- `routes/ml-anomalies.tsx#fetchStats` → KpiStats \| null — `total24h`, `scanned`, `bySeverity[].key`, `bySeverity[].count`, `topSrcIPs[].key`, `topSrcIPs[].count`
- direct handlers: `/api/chart/ml-anomaly-scores`, `/api/v1/ml-anomalies/ack`, `/api/v1/ml-anomalies/ack-all`, `/api/v1/ml-anomalies/acks`, `/api/v1/ml-anomalies/disposition`, `/api/v1/ml-anomalies/stats`, `/api/v1/ml-health`, `/api/v1/store/ml-anomalies`

**Mutations**

- `routes/ml-anomalies.tsx#ackAll` (admin) → `POST /api/v1/ml-anomalies/ack-all`
- `routes/ml-anomalies.tsx#setAck` (admin) → `POST /api/v1/ml-anomalies/ack`
- `routes/ml-anomalies.tsx#setDisposition` (admin) → `POST /api/v1/ml-anomalies/disposition`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset)

**Empty/hint text:** “The backend request failed — this says nothing about whether models are healthy.”; “The backend request failed — nothing here is cached.”

## `payload-analysis.$hash.tsx`

Slice: #78

Carries: `components/ConfirmDialog.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `lib/auth.ts#getSessionUser` (loader) → User \| null — `sub`, `username`, `displayName`, `role`
- `routes/payload-analysis.$hash.tsx#fetchCorrelation` → CorrelationFetch — `state`, `correlation.sandbox_runs[].job`, `correlation.sandbox_runs[].completed_at`, `correlation.sandbox_runs[].exit_status`, `correlation.sandbox_runs[].changed`, `correlation.github.sha256`, `correlation.github.exit_status`, `correlation.github.malicious`, `correlation.github.total`, `correlation.github.level`, `correlation.github.family`, `correlation.ghidra.exit_status`, `correlation.ghidra.completed_at`
- `routes/payload-analysis.$hash.tsx#fetchDetail` (loader) → DetailFetch — `state`, `detail.hash`, `detail.inventory`, `detail.analysis`, `detail.yara`, `detail.size_bytes`, `detail.hex_preview`
- `routes/payload-analysis.$hash.tsx#fetchGoldenImageStatus` (loader) → GoldenImageFetch — `state`, `status.configured`, `status.built_at`, `status.age_days`, `status.checksum_written`, `status.checksum_verified`, `status.stale_monthly`, `status.stale_iso_eval`, `status.checked_at`, `status.error`
- `routes/payload-analysis.$hash.tsx#fetchRelatedEvents` → RelatedFetch — `state`, `related.total`, `related.earliest.time`, `related.earliest.sensor`, `related.earliest.session`
- direct handlers: `/api/payload/{…}/download`, `/api/report/{…}/pdf`, `/api/v1/events`, `/api/v1/ghidra/submit`, `/api/v1/github-analysis/submit`, `/api/v1/payloads/{…}`, `/api/v1/payloads/{…}/report`, `/api/v1/sandbox/golden-image-status`, `/api/v1/sandbox/submit`, `/api/v1/store/ghidra-runs`, `/api/v1/store/github-analysis`, `/api/v1/store/sandbox-runs`

**Mutations**

- `routes/payload-analysis.$hash.tsx#generatePdfReport` (admin) → `POST /api/v1/payloads/{hash}/report (mounted)`
- `routes/payload-analysis.$hash.tsx#submitGhidra` (admin) → `POST ‹path› (mounted)`
- `routes/payload-analysis.$hash.tsx#submitGithubAnalysis` (admin) → `POST ‹path› (mounted)`
- `routes/payload-analysis.$hash.tsx#submitSandbox` (admin) → `POST ‹path› (mounted)`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether an analysis exists for this hash.”

## `payload-workbench.results.tsx`

Slice: #78

Carries: `components/ConfirmDialog.tsx`, `components/Investigate.tsx`, `components/ArtifactList.tsx`, `components/ErrorState.tsx`, `components/CardIcons.tsx`, `components/RowActions.tsx`

**Reads**

- `components/ArtifactList.tsx#fetchArtifacts` → { rows: ArtifactRow[] } \| null — `rows[].filename`, `rows[].kind`, `rows[].content_type`, `rows[].size_bytes`, `rows[].imported_at`
- `lib/auth.ts#getSessionUser` (loader) → User \| null — `sub`, `username`, `displayName`, `role`
- `routes/payload-workbench.results.tsx#fetchAnalyzerCatalog` → CatalogFetch — `state`, `catalog.classification.code`, `catalog.classification.label`, `catalog.classification.platform`, `catalog.classification.category`, `catalog.classification.analysis_path`, `catalog.classification.dynamic`, `catalog.analyzers[].id`, `catalog.analyzers[].display_name`, `catalog.analyzers[].description`, `catalog.analyzers[].accepted_kinds`, `catalog.analyzers[].availability`, `catalog.analyzers[].available`, `catalog.analyzers[].applicable`, `catalog.analyzers[].reason`, `catalog.analyzers[].required_role`, … 7 more
- `routes/payload-workbench.results.tsx#fetchGhidra` (loader) → Page \| null — `total`, `rows`
- `routes/payload-workbench.results.tsx#fetchGpuQueue` (loader) → GpuJob[] \| null — `[].job_id`, `[].job_type`, `[].ref`, `[].model`, `[].estimated_vram_mib`, `[].status`, `[].requested_at`, `[].started_at`, `[].finished_at`, `[].abort_requested`, `[].error`, `[].attempts`
- `routes/payload-workbench.results.tsx#fetchModelHealth` → ModelHealth[] \| null — `[].model`, `[].timestamp`, `[].accepted`, `[].reason`, `[].anomaly_rate_new`, `[].anomaly_rate_previous`, `[].train_samples`
- `routes/payload-workbench.results.tsx#fetchOwnRuns` → { runs: WorkbenchRun[] } \| null — `runs[].id`, `runs[].payload_sha256`, `runs[].payload_kind`, `runs[].owner`, `runs[].recipe_id`, `runs[].recipe_name`, `runs[].state`, `runs[].created_at`, `runs[].updated_at`, `runs[].children[].analyzer_id`, `runs[].children[].display_name`, `runs[].children[].state`, `runs[].children[].reason`, `runs[].children[].summary`, `runs[].children[].result_url`, `runs[].children[].created_at`, … 4 more
- `routes/payload-workbench.results.tsx#fetchRecipes` → { recipes: WorkbenchRecipe[] } \| null — `recipes[].id`, `recipes[].revision`, `recipes[].name`, `recipes[].description`, `recipes[].owner`, `recipes[].scope`, `recipes[].created_at`, `recipes[].analyzers[].analyzer_id`, `recipes[].analyzers[].options`
- `routes/payload-workbench.results.tsx#fetchSandbox` (loader) → Page \| null — `total`, `rows`
- `routes/payload-workbench.results.tsx#fetchStatic` (loader) → Page \| null — `total`, `rows`
- `routes/payload-workbench.results.tsx#fetchWorkbench` (loader) → Page \| null — `total`, `rows`
- `routes/payload-workbench.results.tsx#fetchYara` (loader) → Page \| null — `total`, `rows`
- `routes/payload-workbench.results.tsx#refreshRunFn` → RunResult — `ok`, `run.id`, `run.payload_sha256`, `run.payload_kind`, `run.owner`, `run.recipe_id`, `run.recipe_name`, `run.state`, `run.created_at`, `run.updated_at`, `run.children[].analyzer_id`, `run.children[].display_name`, `run.children[].state`, `run.children[].reason`, `run.children[].summary`, `run.children[].result_url`, … 7 more
- direct handlers: `/api/artifact/{…}/{…}/{…}`, `/api/v1/artifacts/{…}/{…}`, `/api/v1/gpu-queue`, `/api/v1/gpu-queue/{…}/abort`, `/api/v1/ml-health`, `/api/v1/store/ghidra-runs`, `/api/v1/store/sandbox-runs`, `/api/v1/store/static-analysis`, `/api/v1/store/workbench-runs`, `/api/v1/store/yara`, `/api/v1/workbench/analyzers`, `/api/v1/workbench/recipes`, `/api/v1/workbench/runs`, `/api/v1/workbench/runs/{…}`, `/api/v1/workbench/runs/{…}/children/{…}/{…}`

**Mutations**

- `routes/payload-workbench.results.tsx#abortGpuJob` (admin) → `POST /api/v1/gpu-queue/{job_id}/abort (mounted)`
- `routes/payload-workbench.results.tsx#childActionFn` (admin) → `POST /api/v1/workbench/runs/{runId}/children/{analyzerId}/{action} (mounted)`
- `routes/payload-workbench.results.tsx#saveRecipeFn` (admin) → `POST /api/v1/workbench/recipes (mounted)`
- `routes/payload-workbench.results.tsx#submitRun` (admin) → `POST /api/v1/workbench/runs (mounted)`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `payloads.tsx`

Slice: #78

Carries: `components/ConfirmDialog.tsx`, `components/ErrorState.tsx`, `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/payloads.tsx#fetchGithubVerdicts` → VerdictScan \| null — `badges[].sha256`, `badges[].label`, `badges[].family`, `scanned`, `total`
- `routes/payloads.tsx#fetchPayloads` (loader) → Page \| null — `total`, `rows[].Hash`, `rows[].Size`, `rows[].SizeH`, `rows[].MtimeUTC`, `rows[].MIME`, `rows[].Kind`, `rows[].Platform`, `rows[].AnalysisPath`, `rows[].Dynamic`, `rows[].Sources`, `rows[].Copies`, `rows[].Preview`, `rows[].PreviewTruncated`
- `routes/payloads.tsx#fetchSourceCounts` → SourceCensus \| null — `counts`, `other`
- direct handlers: `/api/payload/{…}/download`, `/api/v1/github-analysis/submit`, `/api/v1/payloads`, `/api/v1/store/github-analysis`

**Mutations**

- `routes/payloads.tsx#submitGithubAnalysis` (admin) → `POST /api/v1/github-analysis/submit (mounted)`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about what has been captured.”

## `problem-reports.tsx`

Slice: #77

Carries: `components/Investigate.tsx`, `components/StoreList.tsx`, `components/RowActions.tsx`, `components/ErrorState.tsx`

**Reads**

- `routes/problem-reports.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- direct handlers: `/api/v1/problem-reports/{…}`, `/api/v1/store/problem-reports`

**Mutations**

- `routes/problem-reports.tsx#setStatus` (admin) → `PATCH /api/v1/problem-reports/{id}`

**States:** loading skeleton, error with retry, empty state, admin-only controls, paging (view more / offset)

## `recordings.tsx`

Slice: #75

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/recordings.tsx#fetchRecordings` (loader) → Page \| null — `total`, `rows[].when`, `rows[].src_ip`, `rows[].country`, `rows[].session`, `rows[].shasum`, `rows[].size_bytes`, `rows[].duration_ms`
- `routes/recordings.tsx#fetchReplay` → Replay \| null — `shasum`, `frames`, `duration_seconds`, `transcript`
- direct handlers: `/api/v1/recordings`, `/api/v1/recordings/{…}`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `reports.tsx`

Slice: #79

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/CardIcons.tsx`, `components/RowActions.tsx`

**Reads**

- `lib/auth.ts#getSessionUser` (loader) → User \| null — `sub`, `username`, `displayName`, `role`
- `routes/reports.tsx#fetchDefinitions` (loader) → DefinitionsResponse \| null — `definitions[].id`, `definitions[].name`, `definitions[].template`, `definitions[].theme`, `definitions[].branding.title`, `definitions[].branding.author`, `definitions[].branding.header_left`, `definitions[].branding.header_right`, `definitions[].branding.footer_left`, `definitions[].branding.classification`, `definitions[].scope.window`, `definitions[].scope.ip`, `definitions[].scope.network`, `definitions[].scope.sensor`, `definitions[].scope.port`, `definitions[].scope.signature`, … 19 more
- `routes/reports.tsx#fetchGenerated` (loader) → Page \| null — `total`, `rows`
- `routes/reports.tsx#fetchSandboxJobs` → SandboxJobOption[] \| null — `[].job`, `[].sha256`, `[].risk`
- `routes/reports.tsx#fetchTemplates` (loader) → TemplatesResponse \| null — `templates[].id`, `templates[].name`, `templates[].description`, `templates[].title`, `templates[].theme`, `templates[].window`, `templates[].elements`, `templates[].sandbox`, `templates[].payload`, `templates[].ghidra`, `elements[].id`, `elements[].label`, `elements[].description`
- `routes/reports.tsx#searchPayloads` → PayloadOption[] \| null — `[].hash`, `[].kind`, `[].size`, `[].sources`
- direct handlers: `/api/report/${encodeURIComponent(str(row,`, `/api/report/{…}/pdf`, `/api/v1/payloads`, `/api/v1/reports/definitions`, `/api/v1/reports/definitions/{…}`, `/api/v1/reports/definitions/{…}/generate`, `/api/v1/reports/generated/{…}`, `/api/v1/reports/templates`, `/api/v1/store/generated-reports`, `/api/v1/store/sandbox-runs`

**Mutations**

- `routes/reports.tsx#createDefinition` (admin) → `POST /api/v1/reports/definitions`
- `routes/reports.tsx#deleteDefinition` (admin) → `DELETE /api/v1/reports/definitions/{id}`
- `routes/reports.tsx#deleteGenerated` (admin) → `DELETE /api/v1/reports/generated/{id}`
- `routes/reports.tsx#generateDefinition` (admin) → `POST /api/v1/reports/definitions/{id}/generate`
- `routes/reports.tsx#updateDefinition` (admin) → `PUT /api/v1/reports/definitions/{id}`

**States:** loading skeleton, error with retry, empty state, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The designer needs its template catalog — the request failed.”; “The backend request failed — nothing here is cached.”

## `revdeck.$sha.tsx`

Slice: #78

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/revdeck.$sha.tsx#fetchRun` (loader) → RunFetch — `state`, `run.sha256`, `run.exit_status`, `run.error`, `run.revdeck.workflow`, `run.revdeck.status`, `run.revdeck.answer`, `run.revdeck.steps`, `run.revdeck.tool_calls`, `run.revdeck.citations`, `run.revdeck.warnings`
- direct handlers: `/api/v1/revdeck/{…}`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

**Empty/hint text:** “The backend request failed — this says nothing about whether an analysis exists for this hash.”

## `revdeck.index.tsx`

Slice: #78

Carries: `components/StoreList.tsx`, `components/Investigate.tsx`, `components/CardIcons.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/revdeck.index.tsx#fetchPage` → StorePage \| null — `total`, `rows`
- direct handlers: `/api/v1/store/revdeck`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

## `sandbox.$job.tsx`

Slice: #78

Carries: `components/ArtifactList.tsx`, `components/ConfirmDialog.tsx`, `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `components/ArtifactList.tsx#fetchArtifacts` → { rows: ArtifactRow[] } \| null — `rows[].filename`, `rows[].kind`, `rows[].content_type`, `rows[].size_bytes`, `rows[].imported_at`
- `routes/sandbox.$job.tsx#fetchRun` (loader) → RunFetch — `state`, `run`
- direct handlers: `/api/artifact/{…}/{…}/{…}`, `/api/v1/artifacts/{…}/{…}`, `/api/v1/sandbox/submit`, `/api/v1/sandbox/{…}`

**Mutations**

- `routes/sandbox.$job.tsx#resubmitSandbox` (admin) → `POST /api/v1/sandbox/submit (mounted)`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether a run exists for this job id.”

## `sandbox.vnc.tsx`

Slice: #78

Carries: `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/sandbox.vnc.tsx#fetchVncStatus` (loader) → { status: VncStatus \| null; error: string \| null } — `status.sha256`, `status.bridge_ws`, `error`
- direct handlers: `/api/v1/sandbox/vnc`

**Mutations**

- none

**States:** loading skeleton, empty state, admin-only controls, paging (view more / offset)

## `search.tsx`

Slice: #75

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/search.tsx#searchFn` (loader) → SearchResult \| null — `query`, `redirect`, `groups[].title`, `groups[].hits[].label`, `groups[].hits[].count`, `groups[].hits[].url`, `groups[].more`, `groups[].more_url`, `total`
- direct handlers: `/api/v1/search`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

**Empty/hint text:** “The backend did not answer — results here are never cached. Re-submitting the query re-runs the search.”

## `sensors.$sensor.tsx`

Slice: #77

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/SensorEvents.tsx`, `components/CuratedSensorViews.tsx`, `components/RowActions.tsx`, `components/CapturedMail.tsx`

**Reads**

- `components/CapturedMail.tsx#fetchMailDetailed` → MailFetch — `state`, `mail.session_id`, `mail.body_path`, `mail.size_bytes`, `mail.imported_at`, `mail.from.name`, `mail.from.address`, `mail.to[].name`, `mail.to[].address`, `mail.subject`, `mail.date`, `mail.message_id`, `mail.body_text`, `mail.attachments[].filename`, `mail.attachments[].content_type`, `mail.attachments[].size_bytes`, … 1 more
- `components/CuratedSensorViews.tsx#fetchSensors` → SensorDetail \| null — `mailoney[].session_id`, `mailoney[].when`, `mailoney[].ip`, `mailoney[].port`, `mailoney[].logged_in`, `mailoney[].user`, `mailoney[].pass`, `mailoney[].mail_from`, `mailoney[].rcpt_to`, `mailoney[].body_size`, `mailoney[].truncated`, `mailoney[].body_path`, `mailoney[].body_preview`, `http_requests[].id`, `http_requests[].when`, `http_requests[].ip`, … 31 more
- `routes/sensors.$sensor.tsx#fetchCatalog` (loader) → { sensors: SensorSummary[] } \| null — `sensors[].sensor`, `sensors[].events`, `sensors[].last_seen`
- `routes/sensors.$sensor.tsx#fetchEvents` (loader) → { sensor: string; total: number; rows: SensorEventRow[] } \| null — `sensor`, `total`, `rows[].id`, `rows[].when`, `rows[].src_ip`, `rows[].src_port`, `rows[].dst_port`, `rows[].fields`
- `routes/sensors.$sensor.tsx#fetchOverview` (loader) → Overview \| null — `sensor`, `window`, `events`, `unique_sources`, `first_seen`, `last_seen`, `hourly`, `top_sources[].key`, `top_sources[].count`, `top_countries[].key`, `top_countries[].count`, `top_lists[].label`, `top_lists[].rows[].key`, `top_lists[].rows[].count`, `measures[].label`, `measures[].total`, … 2 more
- direct handlers: `/api/v1/mail/{…}`, `/api/v1/sensors`, `/api/v1/sensors/catalog`, `/api/v1/sensors/{…}/events`, `/api/v1/sensors/{…}/overview`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

**Empty/hint text:** “The backend request failed — this says nothing about how active the sensor is.”; “The backend request failed — the event list below this page normally rides here.”

## `sensors.index.tsx`

Slice: #77

**Reads**

- `routes/sensors.index.tsx#fetchCatalog` (loader) → { sensors: SensorSummary[] } \| null — `sensors[].sensor`, `sensors[].events`
- direct handlers: `/api/v1/sensors/catalog`

**Mutations**

- none

**States:** redirect

## `sessions.$id.tsx`

Slice: #75

Carries: `components/Investigate.tsx`, `components/CapturedMail.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `components/CapturedMail.tsx#fetchMailDetailed` → MailFetch — `state`, `mail.session_id`, `mail.body_path`, `mail.size_bytes`, `mail.imported_at`, `mail.from.name`, `mail.from.address`, `mail.to[].name`, `mail.to[].address`, `mail.subject`, `mail.date`, `mail.message_id`, `mail.body_text`, `mail.attachments[].filename`, `mail.attachments[].content_type`, `mail.attachments[].size_bytes`, … 1 more
- `routes/sessions.$id.tsx#fetchSession` (loader) → SessionFetch — `state`, `session.id`, `session.ip`, `session.country`, `session.first`, `session.last`, `session.total`, `session.sensors[].key`, `session.sensors[].count`, `session.commands[].key`, `session.commands[].count`, `session.credentials[].key`, `session.credentials[].count`, `session.payloads[].key`, `session.payloads[].count`, `session.techniques[].id`, … 17 more
- direct handlers: `/api/export/events.csv`, `/api/v1/mail/{…}`, `/api/v1/sessions/{…}`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about whether the session exists in the window.”

## `settings.tsx`

Slice: #81

Carries: `components/ConfirmDialog.tsx`, `components/ErrorState.tsx`, `components/EsHistoryConsole.tsx`, `components/StoreList.tsx`, `components/ThemeGallery.tsx`, `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `components/EsHistoryConsole.tsx#fetchConsoleHistory` → ConsolePage \| null — `total`, `rows[].record`
- `lib/auth.ts#getAccountActions` (loader) → AccountActions — `manageAccount`, `profile`, `security`, `sessions`
- `lib/auth.ts#getSessionUser` (loader) → User \| null — `sub`, `username`, `displayName`, `role`
- `routes/settings.tsx#fetchAdminData` → AdminConfig \| null — `revision`, `presentation.app_name`, `presentation.product_label`, `presentation.dashboard_title`, `presentation.dashboard_subtitle`, `presentation.org_name`, `presentation.overview_intro`, `presentation.help_link_label`, `presentation.help_link_url`, `presentation.banner_text`, `presentation.banner_severity`, `presentation.banner_expires`, `presentation.footer_text`, `presentation.ai_disclaimer`, `presentation.privacy_notice`, `honeypot.alert_cooldown`, … 27 more
- `routes/settings.tsx#fetchAudit` → AuditResponse \| null — `events[].time`, `events[].actor_subject`, `events[].actor_username`, `events[].action`, `events[].fields`, `events[].revision`, `events[].result`
- `routes/settings.tsx#fetchHistory` → HistoryResponse \| null — `entries[].revision`, `entries[].time`, `entries[].actor_subject`, `entries[].actor_username`, `entries[].action`, `entries[].fields`
- `routes/settings.tsx#fetchPreferences` → Prefs \| null — `theme`, `palette`, `density`, `reduced_motion`, `collapsed_sidebar`, `landing_page`, `remember_filters`, `rows_per_page`, `wrap_long_values`, `timezone`, `clock`, `timestamps`, `auto_refresh`, `refresh_interval_seconds`, `live_toasts`, `live_toast_interval_seconds`, … 11 more
- `routes/settings.tsx#fetchReporterStats` → ReporterStats \| null — `available`, `stats`, `reason`
- `routes/settings.tsx#fetchServiceLogs` → { name: string; lines: number; log: string } \| null — `name`, `lines`, `log`
- `routes/settings.tsx#fetchServices` → ServicesResponse \| null — `available`, `services`, `reason`
- `routes/settings.tsx#fetchStorage` → EsStorage \| null — `cluster_status`, `index_count`, `doc_count`, `store_bytes`
- direct handlers: `/api/export/history.json${activeQuery`, `/api/v1/audit{…}`, `/api/v1/config`, `/api/v1/config/history`, `/api/v1/config/presentation`, `/api/v1/config/rollback`, `/api/v1/config/validate`, `/api/v1/config/{…}`, `/api/v1/events`, `/api/v1/preferences`, `/api/v1/preferences/reset`, `/api/v1/reporter-stats`, `/api/v1/reports/templates`, `/api/v1/services`, `/api/v1/services/{…}/logs`, `/api/v1/services/{…}/{…}`, `/api/v1/settings/storage`, `/api/v1/users`

**Mutations**

- `routes/settings.tsx#putPreferences` (session+) → `GET /api/v1/preferences?{query}`, `PUT /api/v1/preferences`
- `routes/settings.tsx#resetPreferences` (session+) → `POST /api/v1/preferences/reset`
- `routes/settings.tsx#rollbackConfig` (admin) → `POST /api/v1/config/rollback`
- `routes/settings.tsx#runServiceAction` (admin) → `POST /api/v1/services/{name}/{action}?{query}`
- `routes/settings.tsx#saveConfigSection` (admin) → `PUT /api/v1/config/{section}?{query}`
- `routes/settings.tsx#savePresentation` (admin) → `PUT /api/v1/config/presentation?{query}`
- `routes/settings.tsx#validateConfig` (session) → `POST /api/v1/config/validate`

**States:** loading skeleton, error with retry, empty state, confirmation before a destructive action, copy feedback, admin-only controls, paging (view more / offset), download or export

**Empty/hint text:** “The backend request failed — this says nothing about what has been recorded.”; “The backend request failed — nothing on these panes reflects real configuration, so saving is unavailable.”

## `source-health.tsx`

Slice: #77

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/source-health.tsx#fetchHealth` (loader) → SourceHealth \| null — `cluster_status`, `total_documents`, `sensors[].sensor`, `sensors[].documents`, `sensors[].last_seen`, `sensors[].state`, `yara.enabled`, `yara.last_scan`, `yara.rules_sha256`, `yara.samples`, `yara.matched`, `yara.errors`, `runtime.uptime_seconds`, `runtime.rss_bytes`, `runtime.vm_bytes`, `ingest.state`, … 11 more
- direct handlers: `/api/v1/source-health`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset), live refresh

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `topology.tsx`

Slice: #77

Carries: `components/EChart.tsx`, `components/ErrorState.tsx`, `components/Investigate.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/topology.tsx#fetchHealth` (loader) → SensorFreshness[] \| null — `[].sensor`, `[].last_seen`, `[].state`
- `routes/topology.tsx#fetchServices` (loader) → ContainerState[] \| null — `[].name`, `[].state`, `[].exit_code`, `[].health`
- `routes/topology.tsx#fetchTopology` (loader) → Topology \| null — `generated_at`, `sensors[].sensor`, `sensors[].stack`, `sensors[].containers`, `sensors[].ingress`, `sensors[].hostnames`, `sensors[].ports[].proto`, `sensors[].ports[].public`, `sensors[].ports[].host`, `sensors[].ports[].proxy`, `sensors[].raw_index`, `stacks[].stack`, `stacks[].containers[].name`, `stacks[].containers[].adapter_visible`
- direct handlers: `/api/topology/flow`, `/api/v1/services`, `/api/v1/source-health`, `/api/v1/topology`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, copy feedback, paging (view more / offset), live refresh

**Empty/hint text:** “The backend request failed — nothing here is cached.”

## `tty-replay.$shasum.tsx`

Slice: #75

Carries: `components/Investigate.tsx`, `components/ErrorState.tsx`, `components/Tabs.tsx`, `components/RowActions.tsx`

**Reads**

- `routes/tty-replay.$shasum.tsx#fetchProfile` → ProfileFetch — `state`, `profile.ip`, `profile.total`, `profile.country`, `profile.asn`, `profile.sensors[].key`, `profile.sensors[].count`, `profile.commands[].key`, `profile.commands[].count`, `profile.credentials[].key`, `profile.credentials[].count`, `profile.sessions[].key`, `profile.sessions[].count`, `profile.techniques[].key`, `profile.techniques[].count`, `profile.events[].time`, … 3 more
- `routes/tty-replay.$shasum.tsx#fetchReplay` (loader) → ReplayFetch — `state`, `replay.shasum`, `replay.size_bytes`, `replay.imported_at`, `replay.frames`, `replay.duration_seconds`, `replay.transcript`, `replay.ttylog_base64`
- `routes/tty-replay.$shasum.tsx#fetchSourceIp` → SourceIpFetch — `state`, `ip`
- direct handlers: `/api/v1/events`, `/api/v1/investigate/ip/{…}`, `/api/v1/recordings/{…}`

**Mutations**

- none

**States:** loading skeleton, error with retry, empty state, paging (view more / offset)

**Empty/hint text:** “The backend request failed — this says nothing about whether attacker context exists for this recording.”; “The backend request failed — this says nothing about whether a recording exists for this id.”
