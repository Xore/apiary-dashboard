// A session recording's two files: asciicast for `asciinema play`, and the
// sensor's own raw TTY log.
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/Stack'
import { apiHref } from '#/lib/apiHref'

export function RecordingDownloads({ shasum }: { shasum: string }) {
  return (
    <HStack gap={2}>
      <Button label=".cast" size="sm" variant="secondary" tooltip="Download for asciinema play" href={apiHref(`/api/recording/${shasum}/cast`)} />
      <Button label="Raw TTY log" size="sm" variant="secondary" tooltip="The sensor's own terminal log" href={apiHref(`/api/recording/${shasum}/raw`)} />
    </HStack>
  )
}
