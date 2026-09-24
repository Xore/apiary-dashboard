import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { useNavigate } from '@tanstack/react-router'
import { resolveHash } from '#/data/queries'
import { clusterHref } from '#/lib/entities'
import { Panel } from './DashboardBlocks'
import { EntityLink } from './EntityLink'

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV4_CIDR = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
const IPV6 = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*$/
const IPV6_CIDR = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*\/\d{1,3}$/
const ASN = /^AS\d+$/i
const HASH = /^[0-9a-fA-F]{12,64}$/
const CVE = /^CVE-\d{4}-\d{4,}$/i
const URL_SHAPE = /^https?:\/\//i
const DOMAIN = /^(?=.*[a-z])[a-z0-9-]+(\.[a-z0-9-]+)+$/i
const CREDENTIAL = /^[^\s:]+:\S+$/

type Shape = { kind: 'ip' | 'cidr' | 'asn' | 'hash' | 'provider' | 'cve' | 'url' | 'domain' | 'credential'; value: string }

/** What a pasted value is, by shape alone. Anything unrecognised is treated
 * as a provider name. */
function classify(raw: string): Shape {
  const value = raw.trim()
  if (IPV4.test(value) || IPV6.test(value)) return { kind: 'ip', value }
  if (IPV4_CIDR.test(value) || IPV6_CIDR.test(value)) return { kind: 'cidr', value }
  if (ASN.test(value)) return { kind: 'asn', value: value.toUpperCase() }
  if (HASH.test(value)) return { kind: 'hash', value: value.toLowerCase() }
  if (CVE.test(value)) return { kind: 'cve', value: value.toUpperCase() }
  if (URL_SHAPE.test(value)) return { kind: 'url', value }
  if (DOMAIN.test(value)) return { kind: 'domain', value: value.toLowerCase() }
  if (CREDENTIAL.test(value)) return { kind: 'credential', value }
  return { kind: 'provider', value }
}

/** Paste any value and jump to its page: IPs, networks, ASNs, providers,
 * payload hashes, fingerprints, CVEs, URLs, domains and credential pairs,
 * recognised by shape. */
export function IocLookup({ examples }: { examples: string[] }) {
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
        return go(`/sources/${encodeURIComponent(shape.value)}`)
      case 'cidr':
        return go(`/networks/${encodeURIComponent(shape.value)}`)
      case 'asn':
      case 'provider':
        return go(clusterHref(shape.kind, shape.value))
      case 'cve':
      case 'url':
      case 'domain':
      case 'credential':
        return go(`/ioc/${shape.kind}/${encodeURIComponent(shape.value)}`)
      case 'hash': {
        const target = await resolveHash(shape.value)
        if (target.kind === 'payload') return go(`/payloads/${target.value}`)
        if (target.kind === 'cluster') {
          return go(clusterHref(target.clusterKind, target.value))
        }
        setLastHash(shape.value)
        setStatus('not-found')
      }
    }
  }

  return (
      <VStack gap={3}>
        <Panel title="Look up a value">
          <HStack gap={2} vAlign="end">
            <StackItem size="fill">
              <TextInput
                label="Value to look up"
                isLabelHidden
                placeholder="203.0.113.7, 203.0.113.0/24, AS64500, a payload hash, CVE-2017-0144, root:toor…"
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
            endContent={<EntityLink kind="payload" id={lastHash}>Open as a payload</EntityLink>}
          />
        )}
      </VStack>
  )
}
