import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Selector } from '@astryxdesign/core/Selector'
import { HStack, StackItem } from '@astryxdesign/core/Stack'
import { pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Token } from '@astryxdesign/core/Token'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Panel } from '#/components/DashboardBlocks'
import { RecordList } from '#/components/RecordList'
import { generatePassword, getCredentials, provisionCredential } from '#/data/queries'
import type { BaitCredential } from '#/data/types'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/_layout/credentials/')({
  loader: () => getCredentials(),
  component: CredentialsPage,
})

function ProvisionPanel({ targets }: { targets: string[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ target: targets[0] ?? '', path: '', username: '', password: generatePassword(), memo: '', template: '' })
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))
  const valid = form.path.trim() && form.username.trim() && form.password

  return (
    <Panel title="Provision a new credential">
      <Text color="secondary">Provisioning writes the file into the honeypot immediately. It is not a draft.</Text>
      <FormLayout direction="horizontal">
        <Selector label="Honeypot" value={form.target} onChange={(target) => set({ target })} options={targets} />
        <TextInput label="Path" isRequired placeholder="home/mwagner/.aws/credentials" value={form.path} onChange={(path) => set({ path })} />
      </FormLayout>
      <FormLayout direction="horizontal">
        <TextInput label="Username" isRequired value={form.username} onChange={(username) => set({ username })} />
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <TextInput label="Password" isRequired value={form.password} onChange={(password) => set({ password })} />
          </StackItem>
          <Button label="Generate" variant="secondary" onClick={() => set({ password: generatePassword() })} />
        </HStack>
      </FormLayout>
      <TextInput label="Memo" isOptional placeholder="Why this bait exists" value={form.memo} onChange={(memo) => set({ memo })} />
      <TextArea
        label="Content template"
        isOptional
        description="Defaults to a two-line username=/password= file. Use {{username}} and {{password}} as placeholders."
        value={form.template}
        onChange={(template) => set({ template })}
      />
      <HStack hAlign="end">
        <Button
          label="Provision"
          isLoading={busy}
          isDisabled={!valid}
          onClick={async () => {
            setBusy(true)
            try {
              await provisionCredential(form)
              setForm({ ...form, path: '', username: '', password: generatePassword(), memo: '', template: '' })
              await router.invalidate()
            } finally {
              setBusy(false)
            }
          }}
        />
      </HStack>
    </Panel>
  )
}

function CredentialsPage() {
  const { credentials, tokens, targets } = Route.useLoaderData()
  const tokenLabel = (id?: string) => tokens.find((t) => t.id === id)?.memo

  const columns: TableColumn<BaitCredential>[] = [
    { key: 'createdAt', header: 'Created', width: pixel(184), renderCell: (row) => <Text type="supporting">{formatDateTime(row.createdAt)}</Text> },
    { key: 'path', header: 'Path', width: proportional(3), renderCell: (row) => <Text type="code">{row.path}</Text> },
    { key: 'username', header: 'Username', width: pixel(168), renderCell: (row) => <Text type="code" maxLines={1}>{row.username}</Text> },
    { key: 'memo', header: 'Memo', width: proportional(2) },
    {
      key: 'linkedTokenId',
      header: 'Linked token',
      width: pixel(128),
      renderCell: (row) => (row.linkedTokenId ? <Token size="sm" color="blue" label="linked" description={tokenLabel(row.linkedTokenId)} /> : <Text type="supporting">—</Text>),
    },
  ]

  return (
    <RecordList
      title="Credentials"
      description="Bait usernames and passwords planted live into honeypot filesystems. Provision, rotate, and optionally link one to a canarytoken."
      actions={<Text type="supporting">{credentials.length} planted</Text>}
      summary={<ProvisionPanel targets={targets} />}
      rows={credentials}
      columns={columns}
      getId={(row) => row.id}
      getHref={(row) => `/credentials/${encodeURIComponent(row.id)}`}
      emptyState={{ title: 'No bait credentials yet', description: 'Provision one above to plant it into a honeypot.' }}
    />
  )
}
