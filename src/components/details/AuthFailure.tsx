import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import type { AuthFailure } from '#/data/types'
import { formatDateTime } from '#/lib/format'

export function SourceIp({ ip }: { ip?: string }) {
  return ip ? (
    <Link href={`/events?ip=${ip}`}>{ip}</Link>
  ) : (
    <Token label="unattributed" size="sm" />
  )
}

export function AuthInspector({ event }: { event: AuthFailure }) {
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Token label={event.type} size="sm" color="orange" />
        <Text type="code">{event.error}</Text>
      </HStack>
      <MetadataList label={{ position: 'start', width: 112 }}>
        <MetadataListItem label="Time">
          {formatDateTime(event.timestamp)}
        </MetadataListItem>
        <MetadataListItem label="Source IP">
          <SourceIp ip={event.ip} />
        </MetadataListItem>
        <MetadataListItem label="Username tried">
          {event.username ?? '—'}
        </MetadataListItem>
        <MetadataListItem label="Client">{event.clientId}</MetadataListItem>
        <MetadataListItem label="Realm">{event.realm}</MetadataListItem>
        <MetadataListItem label="Redirect">
          <Text type="code">{event.redirectUri ?? '—'}</Text>
        </MetadataListItem>
        <MetadataListItem label="User">{event.userId ?? '—'}</MetadataListItem>
        <MetadataListItem label="Event ID">
          <Text type="code">{event.id}</Text>
        </MetadataListItem>
      </MetadataList>
      <Text type="supporting">
        Recorded redacted: no tokens, codes, or cookies are stored.
      </Text>
    </VStack>
  )
}
