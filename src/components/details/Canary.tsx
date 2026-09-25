import { Button } from '@astryxdesign/core/Button'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { HStack, VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import type { CanaryToken, CanaryTrigger } from '#/data/types'
import { apiHref } from '#/lib/apiHref'
import { formatDateTime } from '#/lib/format'
import { EntityLink } from '#/components/EntityLink'

export function TokenInspector({
  token,
  triggers,
}: {
  token: CanaryToken
  triggers: CanaryTrigger[]
}) {
  const fired = triggers.filter((t) => t.tokenId === token.id)
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center">
        <Token size="sm" label={token.type} />
        {fired.length > 0 ? (
          <Token size="sm" color="red" label={`fired ${fired.length}×`} />
        ) : (
          <Token size="sm" label="never fired" />
        )}
      </HStack>
      <Text>{token.memo}</Text>
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="URL">
          <Text type="code">{token.url}</Text>
        </MetadataListItem>
        <MetadataListItem label="Hostname">
          <Text type="code">{token.hostname}</Text>
        </MetadataListItem>
        <MetadataListItem label="Created">
          {formatDateTime(token.createdAt)}
        </MetadataListItem>
        <MetadataListItem label="Created by">
          {token.createdBy}
        </MetadataListItem>
        <MetadataListItem label="ID">
          <Text type="code">{token.id}</Text>
        </MetadataListItem>
      </MetadataList>
      <HStack gap={2}>
        <Button
          label="Copy URL"
          size="sm"
          variant="secondary"
          onClick={() => void navigator.clipboard.writeText(token.url)}
        />
        {token.artifact && (
          <Button
            label="Download artifact"
            size="sm"
            variant="secondary"
            href={apiHref(`/api/canarytoken/${encodeURIComponent(token.id)}/download`)}
          />
        )}
      </HStack>
    </VStack>
  )
}

export function TriggerInspector({ trigger }: { trigger: CanaryTrigger }) {
  return (
    <VStack gap={4}>
      <Token size="sm" color="red" label={trigger.type} />
      <Text>{trigger.memo}</Text>
      <MetadataList label={{ position: 'start', width: 96 }}>
        <MetadataListItem label="Fired">
          {formatDateTime(trigger.triggeredAt)}
        </MetadataListItem>
        <MetadataListItem label="Source">
          <EntityLink kind="source" id={trigger.srcIp} />
        </MetadataListItem>
        <MetadataListItem label="Location">{trigger.location}</MetadataListItem>
        <MetadataListItem label="User agent">
          <Text type="code">{trigger.userAgent}</Text>
        </MetadataListItem>
      </MetadataList>
      {trigger.manageUrl && (
        <HStack>
          <Button label="Manage token" size="sm" variant="secondary" href={trigger.manageUrl} target="_blank" rel="noopener noreferrer" />
        </HStack>
      )}
    </VStack>
  )
}
