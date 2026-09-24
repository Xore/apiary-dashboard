/**
 * Launch an analysis run: pick a captured sample, pick analyzers, set every
 * option each of them takes, and queue it. Used by Analysis results, Captured
 * payloads, and a payload's own page (which opens it with its hash).
 */
import { useEffect, useId, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { Field } from '@astryxdesign/core/Field'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Spinner } from '@astryxdesign/core/Spinner'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { getAnalysisResults, getPayloads, startAnalysisRun } from '#/data/queries'
import type { AnalysisResult, AnalysisResultsData, AnalysisRunConfig, AnalyzerId, CapturedPayload } from '#/data/types'
import { formatNumber } from '#/lib/format'
import { FilterSelect } from '../FilterSelect'
import { WizardDialog, statusOf } from '../WizardDialog'

const YARA_RULESETS = ['APIARY custom', 'Mirai family', 'Gafgyt family', 'Crypto miners', 'Webshells', 'Packers and crypters', 'Community (signature-base)']
const LINUX_IMAGES = [
  { value: 'ubuntu-22.04-x86_64', label: 'Ubuntu 22.04, x86_64' },
  { value: 'alpine-3.19-x86_64', label: 'Alpine 3.19, x86_64 (musl)' },
  { value: 'debian-12-armhf', label: 'Debian 12, 32-bit ARM' },
  { value: 'debian-12-arm64', label: 'Debian 12, 64-bit ARM' },
  { value: 'openwrt-23-mips', label: 'OpenWrt 23, MIPS (router firmware)' },
]
const WINDOWS_IMAGES = [
  { value: 'win10-22h2', label: 'Windows 10 22H2, Office 2019' },
  { value: 'win11-23h2', label: 'Windows 11 23H2' },
]
const MODELS = [
  { value: 'qwen2.5-coder:14b', label: 'qwen2.5-coder 14B (default, 10 GB VRAM)' },
  { value: 'qwen2.5-coder:32b', label: 'qwen2.5-coder 32B (slower, 20 GB VRAM)' },
  { value: 'llama3.1:8b', label: 'llama3.1 8B (fast, 6 GB VRAM)' },
]
const DURATIONS = ['60', '120', '300', '600']
const NETWORKS = [
  { value: 'none', label: 'No network', description: 'Nothing leaves the guest; C2 lookups fail.' },
  { value: 'simulated', label: 'Simulated internet', description: 'INetSim answers DNS, HTTP and IRC, so droppers reveal their next stage.' },
  { value: 'tor', label: 'Egress through Tor', description: 'Real C2 contact, never from our address. Use sparingly.' },
] as const

/** Which image fits a payload's platform, e.g. linux/mips → OpenWrt. */
function imageFor(platform: string): string {
  if (platform.includes('mips')) return 'openwrt-23-mips'
  if (platform.includes('arm')) return 'debian-12-armhf'
  return 'ubuntu-22.04-x86_64'
}

/** Why an analyzer cannot run on this sample, or undefined when it can. */
function blockedFor(id: AnalyzerId, p: CapturedPayload | undefined): string | undefined {
  if (!p) return undefined
  if (id === 'sandbox' && (!p.dynamic || p.platform === 'windows')) return p.platform === 'windows' ? 'Linux only; use CAPE for Windows samples.' : 'No dynamic route for this sample (static only).'
  if (id === 'cape' && p.kind !== 'PE32') return 'Windows PE files only.'
  if ((id === 'ghidra' || id === 'revdeck') && p.kind === 'shell script') return 'Shell scripts are not decompiled.'
  return undefined
}

function defaults(hash: string, payload?: CapturedPayload): AnalysisRunConfig {
  return {
    hash,
    analyzers: ['static', 'yara'],
    static: { minStringLength: 6, extractIocs: true, decodeCandidates: true, sectionEntropy: true },
    yara: { rulesets: ['APIARY custom', 'Mirai family', 'Crypto miners'], stopAtFirstMatch: false, timeoutSeconds: 60 },
    sandbox: { image: imageFor(payload?.platform ?? ''), durationSeconds: 120, network: 'simulated', capturePcap: true, memoryDump: false, liveView: false },
    cape: { image: 'win10-22h2', durationSeconds: 120, package: 'auto', network: 'simulated', humanInteraction: true },
    ghidra: { depth: 'standard', maxFunctions: 200, model: MODELS[0].value, capa: true, floss: true },
    revdeck: { model: MODELS[0].value, maxSteps: 20, requireCitations: true },
    run: { priority: 'normal', label: '', notify: true, force: false },
  }
}

const ANALYZER_NOUN: Record<AnalyzerId, string> = { static: 'Static analysis', yara: 'YARA', sandbox: 'Linux sandbox', cape: 'CAPE (Windows)', ghidra: 'Ghidra', revdeck: 'RevDeck' }
/** A SegmentedControl with a visible group label (its own label is only the
 * aria-label), as the form-wizard-dialog template does it. */
function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  const inputID = useId()
  const labelID = useId()
  return (
    <Field label={label} inputID={inputID} labelID={labelID} isGroupLabel>
      <SegmentedControl label={label} aria-labelledby={labelID} value={value} onChange={onChange} layout="fill">
        {options.map((o) => (
          <SegmentedControlItem key={o.value} value={o.value} label={o.label} />
        ))}
      </SegmentedControl>
    </Field>
  )
}

const size = (bytes: number) => (bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`)

export function AnalysisRunDialog({ isOpen, onOpenChange, initialHash, onQueued }: { isOpen: boolean; onOpenChange: (open: boolean) => void; initialHash?: string; onQueued?: (run: AnalysisResult) => void }) {
  const [catalog, setCatalog] = useState<{ payloads: CapturedPayload[]; analyzers: AnalysisResultsData['analyzers'] } | null>(null)
  const [config, setConfig] = useState<AnalysisRunConfig>(() => defaults(initialHash ?? ''))

  // The catalog loads when the dialog first opens, so any page can host it.
  useEffect(() => {
    if (!isOpen || catalog) return
    void Promise.all([getPayloads(), getAnalysisResults()]).then(([p, r]) => setCatalog({ payloads: p.payloads, analyzers: r.analyzers }))
  }, [isOpen, catalog])
  // Each opening starts from the host's sample, with options that fit it.
  useEffect(() => {
    if (isOpen) setConfig(defaults(initialHash ?? '', catalog?.payloads.find((p) => p.hash === initialHash)))
  }, [isOpen, initialHash, catalog])

  const payload = catalog?.payloads.find((p) => p.hash === config.hash)
  const set = <TKey extends keyof AnalysisRunConfig>(key: TKey, patch: Partial<AnalysisRunConfig[TKey]>) => setConfig((c) => ({ ...c, [key]: { ...(c[key] as object), ...patch } }))
  const pickSample = (hash: string) => {
    const next = catalog?.payloads.find((p) => p.hash === hash)
    setConfig((c) => ({ ...c, hash, analyzers: c.analyzers.filter((a) => !blockedFor(a, next)), sandbox: { ...c.sandbox, image: imageFor(next?.platform ?? '') } }))
  }
  const gpu = config.analyzers.filter((a) => a === 'ghidra' || a === 'revdeck')

  const optionsFor = (id: AnalyzerId) => {
    switch (id) {
      case 'static':
        return (
          <FormLayout defaultOptionality="optional">
            <NumberInput label="Shortest string to extract" value={config.static.minStringLength} onChange={(n) => set('static', { minStringLength: Math.min(32, Math.max(4, n)) })} description="4 to 32 characters. Lower finds more, and more noise." />
            <Switch label="Extract indicators (IPs, domains, URLs)" value={config.static.extractIocs} onChange={(v) => set('static', { extractIocs: v })} labelPosition="start" labelSpacing="spread" />
            <Switch label="Decode base64 and hex candidates" value={config.static.decodeCandidates} onChange={(v) => set('static', { decodeCandidates: v })} labelPosition="start" labelSpacing="spread" />
            <Switch label="Per-section entropy (packing check)" value={config.static.sectionEntropy} onChange={(v) => set('static', { sectionEntropy: v })} labelPosition="start" labelSpacing="spread" />
          </FormLayout>
        )
      case 'yara':
        return (
          <FormLayout defaultOptionality="optional">
            <FilterSelect label="Rule sets" options={YARA_RULESETS.map((value) => ({ value }))} value={config.yara.rulesets} onChange={(rulesets) => set('yara', { rulesets })} placeholder="Every rule set" />
            <Switch label="Stop at the first match" value={config.yara.stopAtFirstMatch} onChange={(v) => set('yara', { stopAtFirstMatch: v })} labelPosition="start" labelSpacing="spread" />
            <NumberInput label="Timeout (seconds)" value={config.yara.timeoutSeconds} onChange={(n) => set('yara', { timeoutSeconds: Math.min(600, Math.max(10, n)) })} />
          </FormLayout>
        )
      case 'sandbox':
        return (
          <FormLayout defaultOptionality="optional">
            <Selector label="Guest image" options={LINUX_IMAGES} value={config.sandbox.image} onChange={(image) => set('sandbox', { image })} description={payload ? `Suggested for ${payload.platform}.` : undefined} />
            <Segmented label="Run for" value={String(config.sandbox.durationSeconds)} onChange={(v) => set('sandbox', { durationSeconds: Number(v) })} options={DURATIONS.map((d) => ({ value: d, label: `${d}s` }))} />
            <RadioList label="Network" value={config.sandbox.network} onChange={(network) => set('sandbox', { network: network as AnalysisRunConfig['sandbox']['network'] })}>
              {NETWORKS.map((n) => (
                <RadioListItem key={n.value} value={n.value} label={n.label} description={n.description} />
              ))}
            </RadioList>
            <Switch label="Capture network traffic (pcap)" value={config.sandbox.capturePcap} onChange={(v) => set('sandbox', { capturePcap: v })} labelPosition="start" labelSpacing="spread" />
            <Switch label="Dump memory at the end" value={config.sandbox.memoryDump} onChange={(v) => set('sandbox', { memoryDump: v })} labelPosition="start" labelSpacing="spread" />
            <Switch label="Watch it live (VNC)" value={config.sandbox.liveView} onChange={(v) => set('sandbox', { liveView: v })} labelPosition="start" labelSpacing="spread" />
          </FormLayout>
        )
      case 'cape':
        return (
          <FormLayout defaultOptionality="optional">
            <Selector label="Guest image" options={WINDOWS_IMAGES} value={config.cape.image} onChange={(image) => set('cape', { image })} />
            <Segmented label="Run for" value={String(config.cape.durationSeconds)} onChange={(v) => set('cape', { durationSeconds: Number(v) })} options={DURATIONS.map((d) => ({ value: d, label: `${d}s` }))} />
            <Selector
              label="Package"
              options={[
                { value: 'auto', label: 'Detect from the file' },
                { value: 'exe', label: 'Executable' },
                { value: 'dll', label: 'DLL (rundll32)' },
              ]}
              value={config.cape.package}
              onChange={(v) => set('cape', { package: v as AnalysisRunConfig['cape']['package'] })}
            />
            <RadioList label="Network" value={config.cape.network} onChange={(network) => set('cape', { network: network as AnalysisRunConfig['cape']['network'] })}>
              {NETWORKS.map((n) => (
                <RadioListItem key={n.value} value={n.value} label={n.label} description={n.description} />
              ))}
            </RadioList>
            <Switch label="Simulate a person (mouse, clicks, dialogs)" value={config.cape.humanInteraction} onChange={(v) => set('cape', { humanInteraction: v })} labelPosition="start" labelSpacing="spread" />
          </FormLayout>
        )
      case 'ghidra':
        return (
          <FormLayout defaultOptionality="optional">
            <Segmented label="Analysis depth" value={config.ghidra.depth} onChange={(v) => set('ghidra', { depth: v as AnalysisRunConfig['ghidra']['depth'] })} options={[{ value: 'standard', label: 'Standard' }, { value: 'aggressive', label: 'Aggressive' }]} />
            <Selector
              label="Functions to decompile"
              options={[
                { value: '50', label: 'Largest 50' },
                { value: '200', label: 'Largest 200' },
                { value: '1000', label: 'Largest 1,000' },
                { value: '0', label: 'All of them (slow)' },
              ]}
              value={String(config.ghidra.maxFunctions)}
              onChange={(v) => set('ghidra', { maxFunctions: Number(v) })}
            />
            <Selector label="Summary model" options={MODELS} value={config.ghidra.model} onChange={(model) => set('ghidra', { model })} description="Runs on the local GPU queue." />
            <Switch label="capa capability detection" value={config.ghidra.capa} onChange={(v) => set('ghidra', { capa: v })} labelPosition="start" labelSpacing="spread" />
            <Switch label="FLOSS obfuscated strings" value={config.ghidra.floss} onChange={(v) => set('ghidra', { floss: v })} labelPosition="start" labelSpacing="spread" />
          </FormLayout>
        )
      case 'revdeck':
        return (
          <FormLayout defaultOptionality="optional">
            <Selector label="Model" options={MODELS} value={config.revdeck.model} onChange={(model) => set('revdeck', { model })} />
            <NumberInput label="Most tool steps" value={config.revdeck.maxSteps} onChange={(n) => set('revdeck', { maxSteps: Math.min(50, Math.max(5, n)) })} description="5 to 50. Each step runs one tool against the sample." />
            <Switch label="Reject claims without a tool citation" value={config.revdeck.requireCitations} onChange={(v) => set('revdeck', { requireCitations: v })} labelPosition="start" labelSpacing="spread" />
          </FormLayout>
        )
    }
  }

  const loading = (
    <HStack gap={2} vAlign="center">
      <Spinner size="sm" />
      <Text type="supporting">Loading captured payloads…</Text>
    </HStack>
  )

  return (
    <WizardDialog
      title="New analysis run"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      finishLabel="Queue the run"
      width={680}
      onFinish={async () => {
        const run = await startAnalysisRun(config)
        if (run) onQueued?.(run)
      }}
      steps={[
        {
          label: 'Sample',
          errors: payload ? {} : { hash: 'Pick a captured payload to analyze.' },
          render: (shown) =>
            !catalog ? (
              loading
            ) : (
              <FormLayout>
                <FilterSelect
                  label="Payload"
                  mode="single"
                  options={catalog.payloads.map((p) => ({ value: p.hash, label: `${p.hash.slice(0, 16)}… · ${p.kind} · ${p.verdict?.family ?? p.verdict?.label ?? 'no verdict'}` }))}
                  value={config.hash ? [config.hash] : []}
                  onChange={([hash]) => hash && pickSample(hash)}
                  placeholder="Pick a captured payload"
                  description="Every captured sample; type part of its hash, kind or family."
                  status={statusOf(shown, 'hash')}
                />
                {payload && (
                  <Card variant="muted" padding={3}>
                    <MetadataList orientation="vertical">
                      <MetadataListItem label="SHA-256">
                        <Text type="code" maxLines={1}>
                          {payload.hash}
                        </Text>
                      </MetadataListItem>
                      <MetadataListItem label="File">{`${payload.kind} · ${payload.platform} · ${size(payload.sizeBytes)}`}</MetadataListItem>
                      <MetadataListItem label="Captured by">{payload.sources.join(', ')}</MetadataListItem>
                      <MetadataListItem label="Route">{payload.dynamic ? 'static and dynamic' : 'static only'}</MetadataListItem>
                    </MetadataList>
                  </Card>
                )}
              </FormLayout>
            ),
        },
        {
          label: 'Analyzers',
          errors: config.analyzers.length ? {} : { analyzers: 'Pick at least one analyzer.' },
          render: (shown) => (
            <CheckboxList
              label="Analyzers"
              description="Unavailable ones say why; they depend on the sample picked."
              value={config.analyzers}
              onChange={(analyzers) => setConfig((c) => ({ ...c, analyzers: analyzers as AnalyzerId[] }))}
              status={statusOf(shown, 'analyzers')}
            >
              {(catalog?.analyzers ?? []).map((a) => {
                const blocked = blockedFor(a.id, payload)
                return <CheckboxListItem key={a.id} value={a.id} label={a.label} description={blocked ?? a.description} isDisabled={Boolean(blocked)} endContent={a.gpu ? <Token size="sm" color="purple" label="GPU queue" /> : undefined} />
              })}
            </CheckboxList>
          ),
        },
        {
          label: 'Options',
          errors: {},
          render: () => (
            <VStack gap={3}>
              <Text type="supporting">Every setting each chosen analyzer takes. The defaults suit most samples.</Text>
              {config.analyzers.map((id, i) => (
                <Collapsible key={id} trigger={ANALYZER_NOUN[id]} defaultIsOpen={i === 0}>
                  {optionsFor(id)}
                </Collapsible>
              ))}
            </VStack>
          ),
        },
        {
          label: 'Review',
          errors: {},
          render: () => (
            <FormLayout defaultOptionality="optional">
              <TextInput label="Run label" value={config.run.label} onChange={(label) => set('run', { label })} placeholder="e.g. Mirai variant from the cowrie wave" description="Shown in Analysis results instead of “Workbench run”." />
              <Segmented label="Priority" value={config.run.priority} onChange={(v) => set('run', { priority: v as AnalysisRunConfig['run']['priority'] })} options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High (jumps the queue)' }]} />
              <Switch label="Notify me when it finishes" value={config.run.notify} onChange={(v) => set('run', { notify: v })} labelPosition="start" labelSpacing="spread" />
              <Switch label="Re-run analyzers that already have a result" value={config.run.force} onChange={(v) => set('run', { force: v })} labelPosition="start" labelSpacing="spread" />
              <Card variant="muted" padding={3}>
                <MetadataList orientation="vertical">
                  <MetadataListItem label="Sample">{payload ? `${payload.hash.slice(0, 16)}… · ${payload.kind}` : '—'}</MetadataListItem>
                  <MetadataListItem label="Analyzers">{config.analyzers.map((a) => ANALYZER_NOUN[a]).join(', ')}</MetadataListItem>
                  {config.analyzers.includes('sandbox') && <MetadataListItem label="Sandbox">{`${config.sandbox.image}, ${config.sandbox.durationSeconds}s, ${config.sandbox.network} network`}</MetadataListItem>}
                  {config.analyzers.includes('cape') && <MetadataListItem label="CAPE">{`${config.cape.image}, ${config.cape.durationSeconds}s`}</MetadataListItem>}
                  {config.analyzers.includes('yara') && <MetadataListItem label="YARA">{config.yara.rulesets.length ? `${formatNumber(config.yara.rulesets.length)} rule sets` : 'every rule set'}</MetadataListItem>}
                </MetadataList>
              </Card>
              {gpu.length > 0 && <Banner status="info" title={`${gpu.map((a) => ANALYZER_NOUN[a]).join(' and ')} ${gpu.length === 1 ? 'waits' : 'wait'} on the GPU queue`} description="Other analyzers start right away; the GPU jobs run in queue order and can be aborted there." />}
            </FormLayout>
          ),
        },
      ]}
    />
  )
}
