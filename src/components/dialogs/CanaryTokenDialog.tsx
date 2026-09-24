/**
 * Create a canarytoken: what kind, where it is planted, and a last look
 * before it is minted. The token's URL is only known once it exists, so the
 * page shows it after the dialog closes.
 */
import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { TextInput } from '@astryxdesign/core/TextInput'
import { createCanarytoken } from '#/data/queries'
import type { CanaryToken, CanaryTokenType } from '#/data/types'
import { WizardDialog, statusOf } from '../WizardDialog'

// What the extra text field means for the types that take one.
const TEXT_FIELD: Record<string, { label: string; placeholder: string; required: boolean }> = {
  qr_code: { label: 'Text or URL to encode', placeholder: 'https://wifi.example.test/guest', required: false },
  clonedsite: { label: 'Domain of the real site', placeholder: 'portal.example.test', required: true },
}

export function CanaryTokenDialog({ types, isOpen, onOpenChange, onCreated }: { types: CanaryTokenType[]; isOpen: boolean; onOpenChange: (open: boolean) => void; onCreated: (token: CanaryToken) => void }) {
  const [type, setType] = useState('aws_keys')
  const [memo, setMemo] = useState('')
  const [text, setText] = useState('')
  const selected = types.find((t) => t.type === type) ?? types[0]
  const field = TEXT_FIELD[type] as (typeof TEXT_FIELD)[string] | undefined

  const reset = (open: boolean) => {
    if (!open) {
      setType('aws_keys')
      setMemo('')
      setText('')
    }
    onOpenChange(open)
  }

  return (
    <WizardDialog
      title="Create a canarytoken"
      isOpen={isOpen}
      onOpenChange={reset}
      finishLabel="Create token"
      onFinish={async () => onCreated(await createCanarytoken({ type, memo: memo.trim(), text: text.trim() || undefined }))}
      steps={[
        {
          label: 'Type',
          errors: {},
          render: () => (
            <RadioList label="What kind of token" description="Each phones home a different way; plant it where an intruder would touch it." value={type} onChange={setType}>
              {types.map((t) => (
                <RadioListItem key={t.type} value={t.type} label={t.label} description={t.description} />
              ))}
            </RadioList>
          ),
        },
        {
          label: 'Details',
          errors: {
            ...(memo.trim() ? {} : { memo: 'Say where you will plant it; the alert shows this.' }),
            ...(field?.required && !text.trim() ? { text: `${field.label} is needed for this type.` } : {}),
          },
          render: (shown) => (
            <FormLayout defaultOptionality="optional">
              <TextInput label="Memo" isRequired value={memo} onChange={setMemo} placeholder="AWS keys in home/deploy/.aws/credentials on cowrie-vps-01" description="What the alert says when the token fires, so name the place and the host." status={statusOf(shown, 'memo')} />
              {field && <TextInput label={field.label} isRequired={field.required} value={text} onChange={setText} placeholder={field.placeholder} status={statusOf(shown, 'text')} />}
            </FormLayout>
          ),
        },
        {
          label: 'Review',
          errors: {},
          render: () => (
            <FormLayout>
              <Card variant="muted" padding={3}>
                <MetadataList orientation="vertical">
                  <MetadataListItem label="Type">{selected.label}</MetadataListItem>
                  <MetadataListItem label="Memo">{memo.trim()}</MetadataListItem>
                  {field && text.trim() && <MetadataListItem label={field.label}>{text.trim()}</MetadataListItem>}
                </MetadataList>
              </Card>
              <Banner status="info" title="The token is live as soon as it is created" description="Its URL and any file to plant appear on the page once this closes." />
            </FormLayout>
          ),
        },
      ]}
    />
  )
}
