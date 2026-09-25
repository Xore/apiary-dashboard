import { createFileRoute } from '@tanstack/react-router'
import { MailMessage } from '#/components/CapturedMail'
import { Panel } from '#/components/DashboardBlocks'
import { Text } from '@astryxdesign/core/Text'
import { getMail } from '#/data/queries'

export const Route = createFileRoute('/_layout/sessions/$id/mail')({
  loader: ({ params }) => getMail(params.id),
  component: SessionMail,
})

/** The message a mail-sensor session delivered. */
function SessionMail() {
  const mail = Route.useLoaderData()
  return (
    <Panel title="Captured message">
      {mail ? <MailMessage mail={mail} /> : <Text type="supporting">No message body was captured for this session: the client stopped after the envelope.</Text>}
    </Panel>
  )
}
