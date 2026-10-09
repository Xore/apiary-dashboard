// The canarytoken and bait-credential payloads the Rust tier serves
// (backend-service canarytokens.rs, credentials.rs, stores.rs, events.rs),
// as they arrive on the wire. Records are ES `_source` documents written by
// those handlers, so their fields are the json! literals there.

/** GET /api/v1/canarytokens/types: one entry per mintable kind. */
export interface CanaryTokenTypeWire {
  token_type: string
  label: string
  description: string
  requires_upload: boolean
  supports_snippet: boolean
}

/** The upload the Rust tier accepts for a `requires_upload` token
 * (canarytokens.rs MAX_UPLOAD_BYTES, L25). The decoded bytes are capped there,
 * so a larger file answers 400 after the whole body has already travelled. */
export const CANARY_IMAGE_MAX_BYTES = 8 * 1024 * 1024

/** The image types the dashboard lets an operator upload. canarytokens.rs
 * forwards `file_content_type` as the multipart MIME label and checks nothing
 * else, so this list is the dashboard tier's own rule, not the backend's. */
export const CANARY_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'] as const

/** POST /api/v1/canarytokens body (CreateBody). The file_* fields carry the
 * custom web image as base64 (`file_base64`, decoded by the handler); actor
 * fields are added by the dashboard's server fn. */
export interface CreateCanarytokenBody {
  token_type: string
  memo: string
  created_by?: string
  include_text_snippet?: boolean
  text_snippet?: string
  file_base64?: string
  file_name?: string
  file_content_type?: string
}

/** POST /api/v1/canarytokens response (CreatedToken). */
export interface CreatedCanarytokenWire {
  id: string
  token_type: string
  memo: string
  token_url: string
  hostname: string
  created_by: string
  created_at: string
}

/** A dashboard-canarytokens-v1 record (auth_token is stripped before it
 * leaves the backend). filename_hint is set for planted-file kinds. */
export interface CanarytokenRecordWire extends CreatedCanarytokenWire {
  filename_hint?: string
}

/** GET /api/v1/canarytokens: every token, for the credential link picker. */
export interface CanarytokenListWire {
  tokens: CanarytokenRecordWire[]
}

/** GET /api/v1/store/canarytokens?offset&size: the generic store page. */
export interface CanarytokenStorePageWire {
  total: number
  rows: Array<CanarytokenRecordWire & { _doc_id: string }>
}

/** One row of GET /api/v1/events?sensor=canarytokens (events.rs EventRow),
 * cut to what the fired tab reads. `record` is the raw ES `_source`; the
 * canonical frontend reads only honeypot.token_type|channel, manage_url and
 * memo from it, so only those are typed. */
export interface CanaryFiredEventWire {
  id: string
  time: string
  sensor: string
  src_ip: string
  country: string
  detail: string
  record: {
    honeypot?: { token_type?: string; channel?: string; manage_url?: string; memo?: string }
  }
}

export interface CanaryFiredPageWire {
  total: number
  offset: number
  rows: CanaryFiredEventWire[]
}

/** A dashboard-credentials-v1 record. rotated_* appear after the first
 * rotate; linked_token_id after the first link-token ("" once unlinked). */
export interface CredentialRecordWire {
  id: string
  target: string
  path: string
  username: string
  password: string
  content_template: string
  memo: string
  created_by: string
  created_at: string
  rotated_by?: string
  rotated_at?: string
  linked_token_id?: string
}

/** GET /api/v1/credentials. available=false (with error) when ES is down. */
export interface CredentialListWire {
  available: boolean
  error?: string
  credentials: CredentialRecordWire[]
}

/** POST /api/v1/credentials body; target defaults to "cowrie_honeyfs" (the
 * only one accepted), content_template to the username/password pair.
 * Response: CredentialRecordWire. */
export interface CreateCredentialBody {
  target?: string
  path: string
  username: string
  password: string
  content_template?: string
  memo: string
  actor_subject?: string
  actor_username?: string
}

/** POST /api/v1/credentials/{id}/rotate body; an empty password makes the
 * backend generate one. Response: CredentialRecordWire. */
export interface RotateCredentialBody {
  password?: string
  actor_subject?: string
  actor_username?: string
}

/** POST /api/v1/credentials/{id}/link-token body; "" unlinks. Response:
 * CredentialRecordWire. */
export interface LinkCredentialTokenBody {
  token_id: string
  actor_subject?: string
  actor_username?: string
}
