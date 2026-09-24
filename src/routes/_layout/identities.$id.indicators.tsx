import { Grid } from '@astryxdesign/core/Grid'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ValueList } from '#/components/EntityBlocks'

const parent = getRouteApi('/_layout/identities/$id')

export const Route = createFileRoute('/_layout/identities/$id/indicators')({
  component: () => {
    const a = parent.useLoaderData().identity
    return (
      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
        <ValueList title="Fingerprints" kind="fingerprint" values={a.fingerprints} />
        <ValueList title="Payloads" kind="payload" values={a.payloads} />
        <ValueList title="Credential pairs" kind="credential" values={a.credentials} />
        <ValueList title="Sensors" kind="sensor" values={a.sensors} />
      </Grid>
    )
  },
})
