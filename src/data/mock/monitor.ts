// Mock fixtures for the Monitor section (ML anomalies, LLM analysis, agent
// campaigns, auth failures). Everything derives from the shared event set or
// its own fixed seed.
import type {
  AgentCampaign,
  AuthFailure,
  CampaignEvent,
  LlmAnalysis,
  LlmDocType,
  MlAnomaly,
  ModelHealth,
  ScorePoint,
  Severity,
} from '../types'
import { EVENTS, SOURCES } from './fixtures'
import { MOCK_NOW, createRng, hex, int, isoMinutesAgo, pick, pickSkewed } from './random'

const severityForScore = (score: number): Severity =>
  score >= 0.9 ? 'critical' : score >= 0.8 ? 'high' : score >= 0.65 ? 'medium' : 'low'

const round2 = (value: number) => Math.round(value * 100) / 100

// ---- ML anomalies ----------------------------------------------------------

const ANOMALY_EXPLANATIONS = [
  'Connection burst far above this source’s hourly baseline',
  'Rare destination port for this sensor',
  'Command sequence unlike any seen in the training window',
  'Session duration outlier (very long idle session)',
  'Unusual protocol mix from a single source',
  'Login attempt cadence matches no known brute-force profile',
]

function buildAnomalies(): MlAnomaly[] {
  const rng = createRng(0x3141)
  const candidates = EVENTS.filter((_, index) => index % 9 === 0)
  return candidates.slice(0, 160).map((event, index) => {
    const iso = 0.45 + rng() * 0.55
    const lstm = 0.4 + rng() * 0.6
    const hbos = 0.35 + rng() * 0.65
    const composite = round2(iso * 0.4 + lstm * 0.35 + hbos * 0.25)
    const statusRoll = rng()
    const status: MlAnomaly['status'] =
      statusRoll < 0.62 ? 'open'
      : statusRoll < 0.8 ? 'acknowledged'
      : statusRoll < 0.88 ? 'false_positive'
      : statusRoll < 0.95 ? 'true_positive'
      : 'benign_known'
    const unattributed = rng() < 0.06
    return {
      id: `anom-${hex(rng, 10)}`,
      timestamp: event.timestamp,
      severity: severityForScore(composite),
      compositeScore: composite,
      modelScores: { isolationForest: round2(iso), lstmAe: round2(lstm), hbos: round2(hbos) },
      srcIp: unattributed ? undefined : event.srcIp,
      country: unattributed ? undefined : event.country,
      explanation: pick(rng, ANOMALY_EXPLANATIONS),
      sourceEventId: event.id,
      sourceIndex: `honeypot-${event.sensor.split('-')[0]}-2026.09.23`,
      eventType: event.type,
      dstPort: { ssh: 22, telnet: 23, http: 80, smb: 445, rdp: 3389, ftp: 21, mysql: 3306, sip: 5060 }[event.protocol],
      proto: event.protocol === 'sip' ? 'udp' : 'tcp',
      sensor: event.sensor,
      status,
      dispositionReason: status === 'false_positive' ? 'Scheduled internal scanner' : status === 'true_positive' ? 'Confirmed dropper download' : undefined,
      folded: rng() < 0.12 ? int(rng, 2, 7) : 1,
      thresholdAtScoring: 0.62,
      modelState: index % 17 === 0 ? undefined : `iso@r41 · lstm@r38 · hbos@r44`,
    }
  })
}

function buildScoreTimeline(): ScorePoint[] {
  const rng = createRng(0x2718)
  return Array.from({ length: 24 }, (_, i) => ({
    time: new Date(MOCK_NOW - (24 - i) * 3_600_000).toISOString(),
    isolationForest: round2(0.52 + rng() * 0.2 + (i === 18 || i === 19 ? 0.2 : 0)),
    lstmAe: round2(0.48 + rng() * 0.18 + (i === 18 ? 0.25 : 0)),
    hbos: round2(0.44 + rng() * 0.22),
  }))
}

export const ML_ANOMALIES: MlAnomaly[] = buildAnomalies()
export const SCORE_TIMELINE: ScorePoint[] = buildScoreTimeline()
export const MODEL_HEALTH: ModelHealth[] = [
  { model: 'isolation_forest', timestamp: isoMinutesAgo(190), accepted: true, reason: 'Anomaly rate within tolerance', anomalyRateNew: 0.021, anomalyRatePrevious: 0.019, trainSamples: 184_220 },
  { model: 'lstm_ae', timestamp: isoMinutesAgo(410), accepted: false, reason: 'Anomaly rate jumped 3.4× vs. previous model; kept previous checkpoint', anomalyRateNew: 0.071, anomalyRatePrevious: 0.021, trainSamples: 181_904 },
  { model: 'hbos', timestamp: isoMinutesAgo(195), accepted: true, reason: 'Anomaly rate within tolerance', anomalyRateNew: 0.017, anomalyRatePrevious: 0.018, trainSamples: 184_220 },
]

// ---- LLM analysis ----------------------------------------------------------

const INTENTS = ['reconnaissance', 'credential stuffing', 'cryptominer install', 'botnet enrollment', 'persistence', 'data exfiltration', 'unknown']
const BEHAVIORS = ['system fingerprinting', 'downloads remote script', 'modifies credentials', 'clears history', 'adds cron job', 'kills competing miners', 'checks CPU count', 'ssh key implant']
const SUMMARIES: Record<LlmDocType, string[]> = {
  session: [
    'Attacker fingerprinted the host (uname, nproc, cpuinfo) then fetched and ran a shell dropper from a remote host.',
    'Brute-forced root, changed the password, and cleared shell history, which suggests the attacker wanted to keep access.',
    'Enumerated SSH keys and crontab without downloading anything; looks like automated reconnaissance.',
    'Downloaded an XMRig-like binary, killed competing miner processes, and installed a cron entry for persistence.',
    'Single failed login followed by disconnect; probable mass scanner, no follow-up activity.',
  ],
  payload: [
    'ELF shell dropper that fetches architecture-specific Mirai-family bots and deletes itself.',
    'Bash script that installs a cryptominer and adds an authorized SSH key.',
    'Obfuscated Perl IRC bot with a hardcoded C2 channel.',
  ],
  report: [
    'Daily summary: SSH brute force dominated; two sessions installed miners; one new dropper family observed.',
    'Weekly summary: activity up 18% week over week, driven by a single hosting provider.',
  ],
}

function buildLlmAnalyses(): LlmAnalysis[] {
  const rng = createRng(0x11a1)
  const sessions = [...new Map(EVENTS.map((e) => [e.sessionId, e])).values()]
  return Array.from({ length: 64 }, (_, index) => {
    const docType: LlmDocType = index % 11 === 0 ? 'report' : index % 4 === 0 ? 'payload' : 'session'
    const event = pick(rng, sessions)
    const failed = rng() < 0.05
    return {
      id: `llm-${hex(rng, 10)}`,
      timestamp: isoMinutesAgo(index * 21 + int(rng, 0, 15)),
      docType,
      severity: pickSkewed(rng, ['medium', 'high', 'low', 'critical', 'info'] as const),
      confidence: rng() < 0.15 ? undefined : pick(rng, ['low', 'medium', 'high'] as const),
      intent: pickSkewed(rng, INTENTS),
      summary: failed ? '' : pick(rng, SUMMARIES[docType]),
      sessionId: docType === 'session' ? event.sessionId : undefined,
      payloadSha256: docType === 'payload' ? hex(rng, 64) : undefined,
      srcIp: docType === 'report' ? undefined : event.srcIp,
      model: 'qwen2.5:14b-instruct',
      behaviors: docType === 'report' ? [] : Array.from(new Set([pick(rng, BEHAVIORS), pick(rng, BEHAVIORS)])),
      error: failed ? 'model output failed schema validation (guard rejected)' : undefined,
    }
  })
}

export const LLM_ANALYSES: LlmAnalysis[] = buildLlmAnalyses()

// ---- Agent campaigns -------------------------------------------------------

const CATEGORIES = ['encoded-egress-external', 'tool-use-fingerprint', 'cross-sensor-automation', 'prompt-injection-artifact', 'credential-harvest']
const RULES: Array<{ rule: string; category: string; boundary: string; reason: string }> = [
  { rule: 'egress.base64_curl_pipe', category: 'encoded-egress-external', boundary: 'honeypot → internet', reason: 'Base64-decoded command pipes a remote script into sh' },
  { rule: 'agent.tool_call_cadence', category: 'tool-use-fingerprint', boundary: 'attacker → shell', reason: 'Command timing matches an LLM tool-call loop (think/act pauses)' },
  { rule: 'fleet.same_payload_multi_sensor', category: 'cross-sensor-automation', boundary: 'sensor → sensor', reason: 'Identical payload hash delivered to 3+ sensors within 5 minutes' },
  { rule: 'agent.injected_instructions', category: 'prompt-injection-artifact', boundary: 'file → agent context', reason: 'Dropped file contains natural-language instructions aimed at an AI agent' },
  { rule: 'creds.env_sweep', category: 'credential-harvest', boundary: 'host → attacker', reason: 'Sweeps .env and cloud credential paths in one command' },
]

function buildCampaigns(): AgentCampaign[] {
  const rng = createRng(0xa6e7)
  return Array.from({ length: 34 }, (_, index) => {
    const endMin = index * 43 + int(rng, 0, 30)
    const spanMin = int(rng, 4, 180)
    const ruleSet = Array.from(new Set([pickSkewed(rng, RULES), pick(rng, RULES), ...(rng() < 0.3 ? [pick(rng, RULES)] : [])]))
    const eventCount = int(rng, 3, 40)
    const events: CampaignEvent[] = Array.from({ length: Math.min(eventCount, 8) }, (__, e) => {
      const rules = rng() < 0.15 ? [] : [pick(rng, ruleSet)]
      return {
        eventId: hex(rng, 20),
        sourceIndex: `honeypot-cowrie-2026.09.${23 - Math.floor((endMin + spanMin) / 1440)}`,
        timestamp: isoMinutesAgo(endMin + Math.round((spanMin * e) / 8)),
        matchedRules: rules.map((rule) => ({
          rule: rule.rule,
          reason: rule.reason,
          trustBoundary: rule.boundary,
          decodeChain:
            rule.category === 'encoded-egress-external'
              ? [
                  { transform: 'base64', inputSha256: hex(rng, 64), outputSha256: hex(rng, 64), outputLen: int(rng, 80, 400) },
                  { transform: 'gunzip', inputSha256: hex(rng, 64), outputSha256: hex(rng, 64), outputLen: int(rng, 400, 4000) },
                ]
              : [],
        })),
      }
    })
    const source = pickSkewed(rng, SOURCES)
    return {
      id: `camp-${hex(rng, 8)}`,
      timestamp: isoMinutesAgo(endMin),
      start: isoMinutesAgo(endMin + spanMin),
      end: isoMinutesAgo(endMin),
      severity: pickSkewed(rng, ['high', 'medium', 'critical', 'low'] as const),
      categories: Array.from(new Set(ruleSet.map((rule) => rule.category))),
      identifiers: [source.ip, `ssh-hassh:${hex(rng, 12)}`, ...(rng() < 0.4 ? [`ua:python-httpx/0.27`] : [])],
      eventCount,
      events,
    }
  })
}

export const AGENT_CAMPAIGNS: AgentCampaign[] = buildCampaigns()
export const CAMPAIGN_CATEGORIES = CATEGORIES

// ---- Auth-failure events ---------------------------------------------------

const CLIENTS = ['apiary-dashboard', 'grafana', 'arcane', 'kibana', 'langfuse']
const ERRORS = ['invalid_user_credentials', 'user_not_found', 'invalid_client_credentials', 'user_temporarily_disabled']
const TRIED = ['admin', 'root', 'xore', 'operator', 'test', 'grafana', 'administrator']

function buildAuthFailures(): AuthFailure[] {
  const rng = createRng(0x0a17)
  const ips = SOURCES.slice(0, 12).map((source) => source.ip)
  return Array.from({ length: 58 }, (_, index) => {
    const clientId = pickSkewed(rng, CLIENTS)
    const error = pickSkewed(rng, ERRORS)
    const unattributed = rng() < 0.1
    return {
      id: `auth-${hex(rng, 12)}`,
      timestamp: isoMinutesAgo(index * 37 + int(rng, 0, 30)),
      type: error === 'invalid_client_credentials' ? 'CLIENT_LOGIN_ERROR' : 'LOGIN_ERROR',
      ip: unattributed ? undefined : pickSkewed(rng, ips),
      error,
      username: error === 'invalid_client_credentials' ? undefined : pickSkewed(rng, TRIED),
      clientId,
      realm: 'apiary',
      redirectUri: `https://${clientId}.example.test/oauth/callback`,
      userId: error === 'user_not_found' ? undefined : `u-${hex(rng, 8)}`,
    }
  })
}

export const AUTH_FAILURES: AuthFailure[] = buildAuthFailures()
