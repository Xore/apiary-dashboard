import { Grid } from '@astryxdesign/core/Grid'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MiniTable } from '#/components/DashboardBlocks'

const parent = getRouteApi('/_layout/sensors/$sensor')

export const Route = createFileRoute('/_layout/sensors/$sensor/sources')({
  component: () => {
    const { detail } = parent.useLoaderData()
    return (
      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
        <MiniTable title="Who reached it" header="Source address" rows={detail.topSources} entity="source" />
        <MiniTable title="From where" header="Country" rows={detail.topCountries} entity="country" />
      </Grid>
    )
  },
})
