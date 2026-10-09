// Wire → page mapping for the tools slice (canarytokens, bait credentials).
// Pure functions over the shapes in ../contracts/tools; nothing here fetches.
import type { BaitCredential, CanaryToken, CanaryTokenType, CanaryTrigger } from '../types'
import { CANARY_IMAGE_MAX_BYTES, CANARY_IMAGE_TYPES } from '../contracts/tools'
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

/** Why a web image cannot be uploaded, in words for the operator, or
 * undefined when it can. The dialog runs it on the picked File before submit;
 * the live adapter runs it again on the bytes it is about to forward, so the
 * tier's trust boundary does not depend on the browser having checked. */
export function canaryImageProblem(file: { type: string; size: number }): string | undefined {
  if (!(CANARY_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Use a PNG, JPEG or GIF image.'
  if (file.size === 0) return 'The image is empty.'
  if (file.size > CANARY_IMAGE_MAX_BYTES) return `The image must be ${CANARY_IMAGE_MAX_BYTES / (1024 * 1024)} MiB or smaller.`
  return undefined
}

/** The decoded length of a standard base64 string, computed from its length
 * rather than by decoding it (an 8 MiB decode is the thing being bounded).
 * undefined when the string is not well-formed base64. */
export function decodedBase64Length(base64: string): number | undefined {
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return undefined
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return (base64.length / 4) * 3 - padding
}
