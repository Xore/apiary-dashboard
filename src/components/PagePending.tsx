import { Grid } from '@astryxdesign/core/Grid'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/Stack'
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout'

/** A page still loading: the frame's shape, so nothing jumps when it lands. */
export function PagePending() {
  return (
    <Layout
      height="fill"
      padding={6}
      header={
        <LayoutHeader>
          <VStack gap={2}>
            <Skeleton width={280} height={32} />
            <Skeleton width={420} height={16} />
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={96} />
              ))}
            </Grid>
            <Skeleton height={280} />
            <Skeleton height={200} />
          </VStack>
        </LayoutContent>
      }
    />
  )
}
