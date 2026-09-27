/**
 * Create a canarytoken: what kind, where it is planted, and a last look
 * before it is minted. The token's URL is only known once it exists, so the
 * page shows it after the dialog closes.
 */
import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { FileInput } from '@astryxdesign/core/FileInput'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { TextInput } from '@astryxdesign/core/TextInput'
import { createCanarytoken } from '#/data/queries'
import type { CanaryToken, CanaryTokenType } from '#/data/types'
import { WizardDialog, statusOf } from '../WizardDialog'


export function CanaryTokenDialog({ types, isOpen, onOpenChange, onCreated }: { types: CanaryTokenType[]; isOpen: boolean; onOpenChange: (open: boolean) => void; onCreated: (token: CanaryToken) => void }) {
  const [type, setType] = useState(types[0].type)
  const [memo, setMemo] = useState('')
  const [snippet, setSnippet] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const selected = types.find((t) => t.type === type) ?? types[0]

  const reset = (open: boolean) => {
    if (!open) {
      setType(types[0].type)
      setMemo('')
      setSnippet('')
      setImage(null)
    }
    onOpenChange(open)
  }

  return (
    <WizardDialog
      title="Create a canarytoken"
      isOpen={isOpen}
      onOpenChange={reset}
      finishLabel="Create token"
      onFinish={async () =>
        onCreated(
          await createCanarytoken({
            type,
            memo: memo.trim(),
            ...(selected.supportsSnippet && snippet.trim() ? { snippet: snippet.trim() } : {}),
            // Mock: the platform would receive the file; only its name is sent.
            ...(selected.requiresUpload && image ? { imageName: image.name } : {}),
          }),
        )
      }
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
            ...(selected.requiresUpload && !image ? { image: 'Choose the image the token serves.' } : {}),
          },
          render: (shown) => (
            <FormLayout defaultOptionality="optional">
              <TextInput label="Memo" isRequired value={memo} onChange={setMemo} placeholder="Salaries.docx on the SMB share of fileserver01" description="What the alert says when the token fires, so name the place and the host." status={statusOf(shown, 'memo')} />
              {selected.requiresUpload && (
                <FileInput label="Image" isRequired accept="image/png,image/jpeg,image/gif" value={image} onChange={(file) => setImage(Array.isArray(file) ? (file[0] ?? null) : file)} description="The picture the token serves; loading it fires the alert." status={statusOf(shown, 'image')} />
              )}
              {selected.supportsSnippet && (
                <TextInput label="Text snippet" value={snippet} onChange={setSnippet} placeholder="Q3 salary adjustments, final" description="A line of text inside the document, so it looks lived-in when opened." />
              )}
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
                  {selected.requiresUpload && image && <MetadataListItem label="Image">{image.name}</MetadataListItem>}
                  {selected.supportsSnippet && snippet.trim() && <MetadataListItem label="Text snippet">{snippet.trim()}</MetadataListItem>}
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
