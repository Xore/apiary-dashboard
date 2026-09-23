import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { PageFrame } from '#/components/PageFrame'
import { getInfraClusters, getNetworkCampaigns, getSourceProfiles, resolveHash } from '#/data/queries'

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV4_CIDR = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
const IPV6 = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*$/
const IPV6_CIDR = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*\/\d{1,3}$/
const ASN = /^AS\d+$/i
const HASH = /^[0-9a-fA-F]{12,64}$/

type Shape = { kind: 'ip' | 'cidr' | 'asn' | 'hash' | 'provider'; value: string }

/** What a pasted value is, by shape alone. Anything unrecognised is treated
 * as a provider name. */
function classify(raw: string): Shape {
  const value = raw.trim()
  if (IPV4.test(value) || IPV6.test(value)) return { kind: 'ip', value }
  if (IPV4_CIDR.test(value) || IPV6_CIDR.test(value)) return { kind: 'cidr', value }
  if (ASN.test(value)) return { kind: 'asn', value: value.toUpperCase() }
  if (HASH.test(value)) return { kind: 'hash', value: value.toLowerCase() }
  return { kind: 'provider', value }
}

export const Route = createFileRoute('/_layout/investigate/lookup')({
  // Real values from the data set to try, one of each shape.
  loader: async () => {
    const [{ sources }, { campaigns }, clusters] = await Promise.all([getSourceProfiles(), getNetworkCampaigns(), getInfraClusters()])
    return {
      examples: [
        sources[0]?.ip,
        campaigns[0]?.cidr,
        clusters.find((c) => c.kind === 'asn')?.value,
        clusters.find((c) => c.kind === 'provider')?.value,
        clusters.find((c) => c.kind === 'payload')?.value,
      ].filter((value): value is string => Boolean(value)),
    }
  },
  component: LookupPage,
})

function LookupPage() {
  const { examples } = Route.useLoaderData()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'not-found'>('idle')
  const [lastHash, setLastHash] = useState('')

  const go = (href: string) => void navigate({ href })

  const submit = async (raw = value) => {
    if (!raw.trim() || status === 'busy') return
    const shape = classify(raw)
    setStatus('busy')
    switch (shape.kind) {
      case 'ip':
        return go(`/investigate/ip/${encodeURIComponent(shape.value)}`)
      case 'cidr':
        return go(`/investigate/cidr/${encodeURIComponent(shape.value)}`)
      case 'asn':
      case 'provider':
        return go(`/investigate/cluster?kind=${shape.kind}&value=${encodeURIComponent(shape.value)}`)
      case 'hash': {
        const target = await resolveHash(shape.value)
        if (target.kind === 'cluster') {
          return go(`/investigate/cluster?kind=${target.clusterKind}&value=${encodeURIComponent(target.value)}`)
        }
        setLastHash(shape.value)
        setStatus('not-found')
      }
    }
  }

  return (
    <PageFrame
      title="Hash / IOC lookup"
      description="Paste an IP, CIDR, ASN, provider name, payload hash, or connection fingerprint to jump straight to its correlation view."
    >
      <VStack gap={5}>
        <Panel title="Look up a value">
          <HStack gap={2} vAlign="end">
            <StackItem size="fill">
              <TextInput
                label="Value to look up"
                isLabelHidden
                placeholder="203.0.113.7, 203.0.113.0/24, AS64500, a hex payload hash or fingerprint…"
                value={value}
                onChange={(next) => {
                  setValue(next)
                  setStatus('idle')
                }}
                onEnter={() => void submit()}
              />
            </StackItem>
            <Button label="Look up" isLoading={status === 'busy'} isDisabled={!value.trim()} onClick={() => void submit()} />
          </HStack>
          <HStack gap={1.5} wrap="wrap" vAlign="center">
            <Text type="supporting">Try:</Text>
            {examples.map((example) => (
              <Token
                key={example}
                size="sm"
                label={example.length > 28 ? `${example.slice(0, 27)}…` : example}
                onClick={() => {
                  setValue(example)
                  void submit(example)
                }}
              />
            ))}
          </HStack>
        </Panel>
        {status === 'not-found' && (
          <Banner
            status="info"
            title="No cluster correlation"
            description={`${lastHash} matched no payload hash or fingerprint seen from two or more source IPs. It may still be real but below the correlation floor.`}
            endContent={<Link href={`/payload-analysis/${lastHash}`}>Open as a payload</Link>}
          />
        )}
        <Text color="secondary">
          Domains and URLs pulled from payloads are not correlated fleet-wide here. They are cross-referenced per sample
          on the payload's own analysis page.
        </Text>
      </VStack>
    </PageFrame>
  )
}
