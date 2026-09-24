import { describe, expect, it } from 'vitest'
import { NAV_SECTIONS, navHrefFor, navItemFor, pageFor, sectionFor } from './nav'

describe('navigation metadata', () => {
  it('matches the canonical information architecture', () => {
    expect(NAV_SECTIONS.map((s) => s.label)).toEqual(['Monitor', 'Investigate', 'Operations', 'Reports', 'Tools', 'Evidence'])
    expect(NAV_SECTIONS.flatMap((s) => s.items)).toHaveLength(24)
  })

  it('has one entry per route', () => {
    const routes = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.to))
    expect(new Set(routes).size).toBe(routes.length)
  })
})

describe('navHrefFor', () => {
  it.each([
    ['/events', '/events'],
    ['/event/evt-1', '/events'],
    ['/events/evt-1', '/events'],
    ['/events/evt-1/raw', '/events'],
    ['/sources/192.0.2.1', '/ips'],
    ['/sources/192.0.2.1/sessions', '/ips'],
    ['/payloads/abc', '/payloads'],
    ['/payloads/abc/ghidra', '/payloads'],
    ['/sessions/abc', '/events'],
    ['/investigate/ip/192.0.2.1', '/ips'],
    ['/investigate/cidr/192.0.2.0%2F26', '/campaigns'],
    ['/investigate/cluster', '/clusters'],
    ['/networks/192.0.2.0%2F26/sources', '/campaigns'],
    ['/campaigns/192.0.2.0%2F26', '/campaigns'],
    ['/clusters/fingerprint/abc', '/clusters'],
    ['/asn/AS64500', '/clusters'],
    ['/identities/abc/why', '/attackers'],
    ['/sensors/cowrie-vps-01', '/sensors'],
    ['/tty-replay/abc', '/recordings'],
    ['/recordings/abc/attacker', '/recordings'],
    ['/alerts/yara%7Cx/members', '/alerts'],
    ['/ml-anomalies/a1/triage', '/ml-anomalies'],
    ['/llm-analysis/l1', '/llm-analysis'],
    ['/agent-campaigns/c1/rules', '/agent-campaigns'],
    ['/canarytokens/triggers/t1', '/canarytokens'],
    ['/credentials/b1', '/credentials'],
    ['/dead-letters/d1', '/dead-letters'],
    ['/payload-analysis/abc', '/payloads'],
    ['/sandbox/abc', '/payload-workbench/results'],
    ['/sandbox/vnc', '/payload-workbench/results'],
    ['/ghidra/abc', '/payload-workbench/results'],
    ['/revdeck', '/payload-workbench/results'],
    ['/revdeck/abc', '/payload-workbench/results'],
    ['/cape', '/payload-workbench/results'],
    ['/github-analysis/abc', '/payload-workbench/results'],
  ])('rolls %s up to %s', (pathname, parent) => {
    expect(navHrefFor(pathname)).toBe(parent)
  })

  it('does not roll up look-alike prefixes', () => {
    expect(navHrefFor('/capex')).toBe('/capex')
    expect(navHrefFor('/revdecks')).toBe('/revdecks')
  })
})

describe('breadcrumb labels', () => {
  it('names nav pages by their label and section', () => {
    expect(pageFor('/alerts')).toBe('Alerts')
    expect(sectionFor('/alerts')).toBe('Operations')
  })

  it('names drill-downs by their prefix and parent section', () => {
    expect(pageFor('/events/evt-1')).toBe('Event')
    expect(sectionFor('/events/evt-1')).toBe('Investigate')
    expect(pageFor('/sources/192.0.2.1/timeline')).toBe('Source IP')
    expect(pageFor('/payloads/abc/sandbox')).toBe('Payload')
    expect(pageFor('/event/evt-1')).toBe('Event')
    expect(sectionFor('/event/evt-1')).toBe('Investigate')
    expect(navItemFor('/event/evt-1')?.label).toBe('Event explorer')
    expect(pageFor('/revdeck/abc')).toBe('RevDeck result')
    expect(pageFor('/revdeck')).toBe('RevDeck')
    expect(pageFor('/sandbox/vnc')).toBe('Sandbox live view')
  })

  it('names a sensor page after its sensor', () => {
    expect(pageFor('/sensors/cowrie-vps-01')).toBe('cowrie-vps-01')
    expect(pageFor('/sensors/cowrie-vps-01/exposure')).toBe('cowrie-vps-01')
  })

  it('labels unlisted pages and falls back for unknown ones', () => {
    expect(pageFor('/settings')).toBe('Settings')
    expect(sectionFor('/settings')).toBe('')
    expect(pageFor('/nowhere')).toBe('Dashboard')
  })
})
