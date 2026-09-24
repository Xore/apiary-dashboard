// Config validation, as the config store answers POST /config/validate: a
// preview that persists nothing and names every field it would refuse, so
// the settings form can say what is wrong before anything is staged. Rules
// follow the real validator (config.rs validate_*), field by field.
import type { ConfigProblems, ConfigSection, DashboardConfig } from '../types'

const TEXT_LIMIT = 500
const WINDOWS = ['1h', '6h', '24h', '7d', '30d']
const ROWS = [10, 25, 50, 100]
const REFRESH = [10, 15, 30, 60, 120, 300]
const SEVERITIES = ['', 'info', 'success', 'warning', 'danger']

/** `30m`, `2h`, `1d` → seconds; anything else → NaN. */
export function durationSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim())
  if (!match) return NaN
  return Number(match[1]) * { s: 1, m: 60, h: 3600, d: 86_400 }[match[2] as 's' | 'm' | 'h' | 'd']
}

/** Control characters other than tab, newline and carriage return. */
const hasControl = (value: string) => [...value].some((c) => {
  const code = c.charCodeAt(0)
  return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
})

function text(problems: ConfigProblems, field: string, value: string, { required = false } = {}) {
  if (required && value.trim() === '') problems[field] = 'Must not be empty.'
  else if (value.length > TEXT_LIMIT) problems[field] = `At most ${TEXT_LIMIT} characters.`
  else if (hasControl(value)) problems[field] = 'Must not contain control characters.'
}

function range(problems: ConfigProblems, field: string, value: number, min: number, max: number, unit = '') {
  if (!Number.isFinite(value) || value < min || value > max) problems[field] = `Between ${min.toLocaleString('en-US')} and ${max.toLocaleString('en-US')}${unit}.`
}

function subset(problems: ConfigProblems, field: string, values: number[], allowed: number[]) {
  if (values.length === 0) problems[field] = 'Pick at least one.'
  else if (!values.every((v) => allowed.includes(v))) problems[field] = `Only ${allowed.join(', ')}.`
}

export function validateSection<TSection extends ConfigSection>(section: TSection, value: DashboardConfig[TSection], templates: string[]): ConfigProblems {
  const problems: ConfigProblems = {}
  if (section === 'presentation') {
    const p = value as DashboardConfig['presentation']
    text(problems, 'appName', p.appName, { required: true })
    for (const field of ['productLabel', 'dashboardTitle', 'dashboardSubtitle', 'orgName', 'overviewIntro', 'helpLinkLabel', 'bannerText', 'footerText', 'aiDisclaimer', 'privacyNotice'] as const) text(problems, field, p[field])
    if (p.helpLinkUrl !== '' && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(p.helpLinkUrl)) problems.helpLinkUrl = 'Empty, or an https:// link.'
    if (!SEVERITIES.includes(p.bannerSeverity)) problems.bannerSeverity = 'Empty, info, success, warning or danger.'
    if (p.bannerExpires !== '' && Number.isNaN(Date.parse(p.bannerExpires))) problems.bannerExpires = 'An RFC 3339 time, or empty.'
    if (p.bannerText === '' && p.bannerSeverity !== '') problems.bannerText = 'A banner severity needs banner text.'
  }
  if (section === 'behavior') {
    const b = value as DashboardConfig['behavior']
    if (!b.defaultLanding.startsWith('/') || b.defaultLanding.startsWith('//')) problems.defaultLanding = 'A path inside the dashboard, starting with /.'
    if (!WINDOWS.includes(b.defaultTimeWindow)) problems.defaultTimeWindow = `One of ${WINDOWS.join(', ')}.`
    subset(problems, 'rowsPerPageOptions', b.rowsPerPageOptions, ROWS)
    subset(problems, 'refreshIntervalOptions', b.refreshIntervalOptions, REFRESH)
    range(problems, 'maxExportRows', b.maxExportRows, 100, 100_000, ' rows')
    range(problems, 'sourceStaleMinutes', b.sourceStaleMinutes, 1, 1440, ' minutes')
    if (b.defaultTimezone !== 'browser' && !/^[A-Za-z_]+(\/[A-Za-z_+-]+)+$|^UTC$/.test(b.defaultTimezone)) problems.defaultTimezone = 'An IANA zone such as Europe/Berlin, or browser.'
  }
  if (section === 'honeypot') {
    const h = value as DashboardConfig['honeypot']
    const cooldown = durationSeconds(h.alertCooldown)
    if (!(cooldown >= 300 && cooldown <= 604_800)) problems.alertCooldown = 'A duration between 5m and 168h, such as 30m or 2h.'
    range(problems, 'alertCampaignScore', h.alertCampaignScore, 0, 100)
    range(problems, 'sandboxAlertRiskScore', h.sandboxAlertRiskScore, 0, 100)
    range(problems, 'mlAlertThreshold', h.mlAlertThreshold, 0, 1)
    range(problems, 'yaraScanIntervalSeconds', h.yaraScanIntervalSeconds, 60, 86_400, ' s')
    range(problems, 'yaraMaxBytes', h.yaraMaxBytes, 1_048_576, 1_073_741_824, ' bytes')
    range(problems, 'payloadDedupeIntervalSeconds', h.payloadDedupeIntervalSeconds, 60, 86_400, ' s')
  }
  if (section === 'reportPresets') {
    for (const [id, override] of Object.entries(value as DashboardConfig['reportPresets'])) {
      if (!templates.includes(id)) problems[id] = `No report template is called ${id}.`
      else {
        text(problems, `${id}.name`, override?.name ?? '')
        text(problems, `${id}.description`, override?.description ?? '')
      }
    }
  }
  return problems
}
