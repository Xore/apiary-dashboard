// Captured mail for the mail sensor's sessions: the message behind each
// envelope, built from the session's own sender and recipient. A session
// that never got past the envelope has no body, as live: that is an answer
// about the session, not a failure.
import type { CapturedMail, HoneypotEvent } from '../types'
import { createRng, hex, int, pick } from './random'

type Template = Pick<CapturedMail, 'subject' | 'bodyText' | 'fromHtml' | 'attachments'> & { fromName: string }

const templates = (rng: () => number, invoice = int(rng, 40000, 49999)): Template[] => [
  {
    fromName: '',
    subject: 'SMTP relay test',
    bodyText: 'This is a relay test from 198.51.100.77.\r\nIf you receive this, the server relays mail for anyone.\r\n',
    fromHtml: false,
    attachments: [],
  },
  {
    fromName: 'IT Service Desk',
    subject: 'Action required: your mailbox is 98% full',
    bodyText: 'Dear user,\n\nYour mailbox has reached 98% of its quota and will stop receiving mail in 24 hours.\nValidate your account to keep your messages:\n\nhttp://203.0.113.50/owa/auth/logon.aspx?user=\n\nIT Service Desk\n',
    fromHtml: true,
    attachments: [],
  },
  {
    fromName: 'Accounts Receivable',
    subject: `Overdue invoice #${invoice}`,
    bodyText: 'Hello,\n\nPlease find attached the overdue invoice. Payment is due within 3 days to avoid collection fees.\n\nRegards,\nAccounts Receivable\n',
    fromHtml: false,
    attachments: [
      { filename: `Invoice_${invoice}.pdf.exe`, contentType: 'application/octet-stream', sizeBytes: int(rng, 120_000, 480_000), sha256: hex(rng, 64) },
      { filename: 'logo.png', contentType: 'image/png', sizeBytes: int(rng, 2_000, 9_000), sha256: hex(rng, 64) },
    ],
  },
  {
    fromName: 'Mr. Adewale Okonkwo',
    subject: 'Confidential business proposal',
    bodyText: 'Dear friend,\n\nI am a senior officer with access to an unclaimed deposit of USD 12,500,000. I seek a trustworthy partner to receive the funds, for which you will be compensated with 30%.\n\nReply with your full name and telephone number.\n',
    fromHtml: false,
    attachments: [],
  },
]

const address = (value: string) => {
  const match = /<([^>]+)>/.exec(value)
  return match ? match[1] : value.replace(/^mail from:|^rcpt to:/i, '').trim()
}

/** The message for one mail-sensor session, or null when only the envelope
 * was captured. */
export function mailFor(sessionId: string, events: HoneypotEvent[]): CapturedMail | null {
  const own = events.filter((e) => e.sessionId === sessionId && e.sensor === 'mailoney')
  const body = own.find((e) => e.eventName === 'mail-body')
  if (!body) return null
  const rng = createRng([...sessionId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7))
  const template = pick(rng, templates(rng))
  const fromAddress = address(String(body.fields.mail_from ?? 'noreply@example.test'))
  const toAddress = address(String(body.fields.rcpt_to ?? 'receiver@example.test'))
  return {
    sessionId,
    sizeBytes: template.bodyText.length + template.attachments.reduce((n, a) => n + Math.round(a.sizeBytes * 1.37), 0) + 900,
    importedAt: body.timestamp,
    from: { name: template.fromName, address: fromAddress },
    to: [{ name: '', address: toAddress }],
    subject: template.subject,
    date: new Date(Date.parse(body.timestamp) - int(rng, 5, 90) * 1000).toUTCString().replace('GMT', '+0000'),
    messageId: `<${hex(rng, 16)}@${fromAddress.split('@')[1] ?? 'example.test'}>`,
    bodyText: template.bodyText,
    fromHtml: template.fromHtml,
    attachments: template.attachments,
  }
}
