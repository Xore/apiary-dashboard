// Tools slice adapters: one realistic wire fixture per endpoint, mapped to
// the page types the canarytokens and credentials pages already render.
import { describe, expect, it } from 'vitest'
import type { CanarytokenRecordWire, CredentialRecordWire } from '../contracts/tools'
import {
  baitCredential,
  canaryTokenTypes,
  canaryTriggers,
  canarytokenList,
  canarytokenStorePage,
  createdCanarytoken,
  credentialList,
} from './tools'

const record: CanarytokenRecordWire = {
  id: 'a1b2c3d4e5f6a7b8c9d0e1f2a',
  token_type: 'doc_msword',
  memo: 'finance share bait',
  token_url: 'http://canary.example.test/tags/a1b2/index.html',
  hostname: 'a1b2.canary.example.test',
  filename_hint: 'payroll.docx',
  created_by: 'analyst',
  created_at: '2026-09-30T10:00:00Z',
}

const credential: CredentialRecordWire = {
  id: 'cred_0011223344556677',
  target: 'cowrie_honeyfs',
  path: 'home/admin/.aws/credentials',
  username: 'deploy',
  password: 'xK7pQ2mN9rT4vW8yZ3bC',
  content_template: 'username={{username}}\npassword={{password}}\n',
  memo: 'aws bait',
  created_by: 'analyst',
  created_at: '2026-09-29T08:00:00Z',
}

describe('tools adapters', () => {
  it('maps GET /canarytokens/types', () => {
    expect(
      canaryTokenTypes([{ token_type: 'web_image', label: 'Custom web image', description: 'Fires when loaded.', requires_upload: true, supports_snippet: false }]),
    ).toEqual([{ type: 'web_image', label: 'Custom web image', description: 'Fires when loaded.', requiresUpload: true, supportsSnippet: false }])
  })

  it('maps POST /canarytokens without a file artifact', () => {
    const { filename_hint: _, ...created } = record
    const token = createdCanarytoken(created)
    expect(token).toEqual({ id: record.id, type: 'doc_msword', memo: 'finance share bait', url: record.token_url, hostname: record.hostname, createdAt: record.created_at, createdBy: 'analyst' })
    expect('artifact' in token).toBe(false)
  })

  it('maps GET /canarytokens and the store page, filename_hint as the artifact', () => {
    expect(canarytokenList({ tokens: [record] })[0].artifact).toBe('payroll.docx')
    const page = canarytokenStorePage({ total: 26, rows: [{ ...record, _doc_id: record.id }] })
    expect(page.total).toBe(26)
    expect(page.tokens[0]).toMatchObject({ id: record.id, type: 'doc_msword', artifact: 'payroll.docx' })
  })

  it('maps fired-token events', () => {
    const [trigger, bare] = canaryTriggers({
      total: 2,
      offset: 0,
      rows: [
        { id: 'ev1', time: '2026-10-01T12:00:00Z', sensor: 'canarytokens', src_ip: '203.0.113.7', country: 'NL', detail: 'opened', record: { honeypot: { token_type: 'doc_msword', manage_url: 'http://canary.example.test/manage?x', memo: 'finance share bait' } } },
        { id: 'ev2', time: '2026-10-01T11:00:00Z', sensor: 'canarytokens', src_ip: '198.51.100.2', country: '', detail: 'dns lookup', record: { honeypot: { channel: 'DNS' } } },
      ],
    })
    expect(trigger).toEqual({ id: 'ev1', tokenId: '', memo: 'finance share bait', type: 'doc_msword', triggeredAt: '2026-10-01T12:00:00Z', srcIp: '203.0.113.7', userAgent: '', location: 'NL', manageUrl: 'http://canary.example.test/manage?x' })
    expect(bare).toMatchObject({ memo: 'dns lookup', type: 'DNS' })
    expect('manageUrl' in bare).toBe(false)
  })

  it('maps GET /credentials and the POST record', () => {
    expect(credentialList({ available: true, credentials: [credential] })).toEqual([
      { id: credential.id, path: credential.path, target: 'cowrie_honeyfs', username: 'deploy', password: credential.password, memo: 'aws bait', template: credential.content_template, createdAt: credential.created_at, createdBy: 'analyst' },
    ])
    expect(credentialList({ available: false, error: 'es down', credentials: [] })).toEqual([])
  })

  it('maps rotate and link-token records, dropping an unlinked token', () => {
    const rotated = baitCredential({ ...credential, rotated_at: '2026-10-02T09:00:00Z', rotated_by: 'admin', linked_token_id: record.id })
    expect(rotated).toMatchObject({ rotatedAt: '2026-10-02T09:00:00Z', rotatedBy: 'admin', linkedTokenId: record.id })
    expect('linkedTokenId' in baitCredential({ ...credential, linked_token_id: '' })).toBe(false)
  })
})
