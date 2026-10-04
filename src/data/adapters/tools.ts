// Wire → page mapping for the tools slice (canarytokens, bait credentials).
// Pure functions over the shapes in ../contracts/tools; nothing here fetches.
import type { BaitCredential, CanaryToken, CanaryTokenType, CanaryTrigger } from '../types'
import type {
  CanaryFiredPageWire,
  CanaryTokenTypeWire,
  CanarytokenListWire,
  CanarytokenRecordWire,
  CanarytokenStorePageWire,
  CreatedCanarytokenWire,
  CredentialListWire,
  CredentialRecordWire,
} from '../contracts/tools'

export function canaryTokenTypes(wire: CanaryTokenTypeWire[]): CanaryTokenType[] {
  return wire.map((t) => ({
    type: t.token_type,
    label: t.label,
    description: t.description,
    requiresUpload: t.requires_upload,
    supportsSnippet: t.supports_snippet,
  }))
}

export function canaryToken(wire: CreatedCanarytokenWire | CanarytokenRecordWire): CanaryToken {
  const hint = 'filename_hint' in wire ? wire.filename_hint : undefined
  return {
    id: wire.id,
    type: wire.token_type,
    memo: wire.memo,
    url: wire.token_url,
    hostname: wire.hostname,
    createdAt: wire.created_at,
    createdBy: wire.created_by,
    ...(hint ? { artifact: hint } : {}),
  }
}

/** POST /api/v1/canarytokens. */
export const createdCanarytoken = (wire: CreatedCanarytokenWire): CanaryToken => canaryToken(wire)

/** GET /api/v1/canarytokens. */
export const canarytokenList = (wire: CanarytokenListWire): CanaryToken[] => wire.tokens.map(canaryToken)

/** GET /api/v1/store/canarytokens. */
export function canarytokenStorePage(wire: CanarytokenStorePageWire): { total: number; tokens: CanaryToken[] } {
  return { total: wire.total, tokens: wire.rows.map(canaryToken) }
}

/** GET /api/v1/events?sensor=canarytokens. The event row carries no token
 * id or user agent; they stay empty (see the slice's gaps). */
export function canaryTriggers(wire: CanaryFiredPageWire): CanaryTrigger[] {
  return wire.rows.map((row) => {
    const hp = row.record.honeypot ?? {}
    return {
      id: row.id,
      tokenId: '',
      memo: hp.memo || row.detail,
      type: hp.token_type || hp.channel || '',
      triggeredAt: row.time,
      srcIp: row.src_ip,
      userAgent: '',
      location: row.country,
      ...(hp.manage_url ? { manageUrl: hp.manage_url } : {}),
    }
  })
}

/** A credential record, as GET /api/v1/credentials lists it and the
 * create, rotate and link-token POSTs return it. */
export function baitCredential(wire: CredentialRecordWire): BaitCredential {
  return {
    id: wire.id,
    path: wire.path,
    target: wire.target,
    username: wire.username,
    password: wire.password,
    memo: wire.memo,
    template: wire.content_template,
    createdAt: wire.created_at,
    createdBy: wire.created_by,
    ...(wire.linked_token_id ? { linkedTokenId: wire.linked_token_id } : {}),
    ...(wire.rotated_at ? { rotatedAt: wire.rotated_at } : {}),
    ...(wire.rotated_by ? { rotatedBy: wire.rotated_by } : {}),
  }
}

/** GET /api/v1/credentials. */
export const credentialList = (wire: CredentialListWire): BaitCredential[] => wire.credentials.map(baitCredential)
