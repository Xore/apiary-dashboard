// Invariants over the mock data seam: numbers shown on different pages agree,
// and every id one page links to resolves on the page it links to. These
// caught real bugs while the mock pages were built (#12's link crawl).
import { describe, expect, it } from 'vitest'
import * as q from './queries'

describe('cross-page consistency', () => {
  it('overview event KPI equals the event explorer total', async () => {
    const [overview, events] = await Promise.all([q.getOverview(), q.getEvents({})])
    expect(overview.kpis.find((k) => k.id === 'events')?.value).toBe(events.total)
  })

  it('ML severity tiles add up to the 24h total', async () => {
    const ml = await q.getMlAnomalies()
    expect(ml.bySeverity.reduce((sum, row) => sum + row.count, 0)).toBe(ml.total24h)
  })

  it('source health and topology agree on unhealthy feeds', async () => {
    const [health, topology] = await Promise.all([q.getSourceHealth(), q.getTopology()])
    const unhealthy = (states: Array<{ sensor: string; state?: string; feed?: string }>) =>
      states.filter((s) => (s.state ?? s.feed) !== 'fresh').map((s) => s.sensor).sort()
    expect(unhealthy(health.feeds)).toEqual(unhealthy(topology.sensors))
  })

  it('payload page and GitHub page show the same detection count', async () => {
    for (const g of await q.getGithubAnalyses()) {
      const analysis = await q.getPayloadAnalysis(g.sha)
      expect(analysis?.github?.detections).toBe(g.detections)
    }
  })

  it('payload page and sandbox page agree on the sandbox verdict', async () => {
    const { results } = await q.getAnalysisResults()
    for (const r of results.filter((x) => x.analyzer === 'sandbox')) {
      const [analysis, run] = await Promise.all([q.getPayloadAnalysis(r.hash), q.getSandboxRun(r.hash)])
      expect(analysis?.sandbox?.verdict).toBe(run?.verdict)
    }
  })
})

describe('link integrity', () => {
  it('every referenced payload hash has an analysis page', async () => {
    const [attackers, clusters, llm] = await Promise.all([q.getAttackers(), q.getInfraClusters(), q.getLlmAnalyses()])
    const hashes = [
      ...attackers.flatMap((a) => a.payloads),
      ...clusters.filter((c) => c.kind === 'payload').map((c) => c.value),
      ...llm.flatMap((a) => (a.payloadSha256 ? [a.payloadSha256] : [])),
    ]
    expect(hashes.length).toBeGreaterThan(0)
    for (const hash of hashes) expect(await q.getPayloadAnalysis(hash), hash).not.toBeNull()
  })

  it('every analyzer result links to a page that exists', async () => {
    const { results } = await q.getAnalysisResults()
    for (const r of results.filter((x) => x.analyzer === 'ghidra')) expect(await q.getGhidraAnalysis(r.hash), r.hash).not.toBeNull()
    for (const r of results.filter((x) => x.analyzer === 'sandbox')) expect(await q.getSandboxRun(r.hash), r.hash).not.toBeNull()
    for (const run of await q.getRevDeckRuns()) expect(await q.getGhidraAnalysis(run.sha), run.sha).not.toBeNull()
  })

  it('every campaign, cluster, and source resolves to its investigation page', async () => {
    const [{ campaigns }, clusters, { sources }] = await Promise.all([q.getNetworkCampaigns(), q.getInfraClusters(), q.getSourceProfiles()])
    for (const c of campaigns) expect(await q.getCidrCorrelation(c.cidr), c.cidr).not.toBeNull()
    for (const c of clusters) expect(await q.getClusterCorrelation(c.kind, c.value), c.id).not.toBeNull()
    for (const s of sources.slice(0, 20)) expect(await q.getIpProfile(s.ip), s.ip).not.toBeNull()
  })

  it('sessions, events, and recordings referenced elsewhere resolve', async () => {
    const [llm, ml, recordings] = await Promise.all([q.getLlmAnalyses(), q.getMlAnomalies(), q.getRecordings()])
    for (const a of llm.filter((x) => x.sessionId)) expect(await q.getSessionDetail(a.sessionId!), a.sessionId).not.toBeNull()
    for (const a of ml.anomalies.slice(0, 20)) expect(await q.getEventDetail(a.sourceEventId), a.sourceEventId).not.toBeNull()
    for (const r of recordings.slice(0, 20)) expect(await q.getReplayDetail(r.shasum), r.shasum).not.toBeNull()
  })

  it('unknown ids resolve to null (rendered as 404)', async () => {
    expect(await q.getEventDetail('evt-nope')).toBeNull()
    expect(await q.getIpProfile('10.0.0.1')).toBeNull()
    expect(await q.getPayloadAnalysis('deadbeef')).toBeNull()
    expect(await q.getCidrCorrelation('not-a-cidr')).toBeNull()
  })
})

describe('filters and search', () => {
  it('filters events by kind, port, and time window', async () => {
    const logins = await q.getEvents({ kind: 'login' })
    expect(logins.rows.every((e) => e.type === 'login.failed' || e.type === 'login.success')).toBe(true)
    const ssh = await q.getEvents({ port: 22 })
    expect(ssh.rows.every((e) => e.dstPort === 22)).toBe(true)
    const all = await q.getEvents({})
    const lastHour = await q.getEvents({ since: '1h' })
    expect(lastHour.total).toBeGreaterThan(0)
    expect(lastHour.total).toBeLessThan(all.total)
  })

  it('applies every term of an AND history query', async () => {
    const rows = await q.searchHistory('sensor:cowrie-vps-01 AND username:root')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((e) => e.sensor === 'cowrie-vps-01' && e.username?.includes('root'))).toBe(true)
    expect(await q.searchHistory('nosuchfield:x')).toEqual([])
  })

  it('groups search results and returns nothing for an empty query', async () => {
    expect(await q.searchAll('')).toEqual([])
    const groups = await q.searchAll('root')
    expect(groups.map((g) => g.id)).toContain('credentials')
  })
})

describe('mock writes', () => {
  it('acknowledge-all empties the New view', async () => {
    expect((await q.getAlerts()).some((g) => !g.acknowledged)).toBe(true)
    await q.acknowledgeAllAlerts()
    expect((await q.getAlerts()).some((g) => !g.acknowledged)).toBe(false)
  })

  it('blocks and unblocks an address', async () => {
    const { sources } = await q.getSourceProfiles()
    const ip = sources[0].ip
    await q.setIpBlocked(ip, true)
    expect((await q.getIpProfile(ip))?.blocked).toBe(true)
    await q.setIpBlocked(ip, false)
    expect((await q.getIpProfile(ip))?.blocked).toBe(false)
  })

  it('dead-letter purge removes only the rows it was given', async () => {
    const matching = await q.getDeadLetters('mapper_parsing')
    const before = (await q.getDeadLetters('')).length
    await q.purgeDeadLetters(matching.map((d) => d.id))
    expect((await q.getDeadLetters('')).length).toBe(before - matching.length)
  })

  it('only queued GPU jobs can be aborted', async () => {
    const { gpuQueue } = await q.getAnalysisResults()
    const running = gpuQueue.find((j) => j.status === 'running')!
    const queued = gpuQueue.find((j) => j.status === 'queued')!
    expect(await q.abortGpuJob(running.jobId)).toBe(false)
    expect(await q.abortGpuJob(queued.jobId)).toBe(true)
  })
})
