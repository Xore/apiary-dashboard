import { useMemo } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countries110m from 'world-atlas/countries-110m.json'
import { useNavigate } from '@tanstack/react-router'
import type { MapPoint } from '#/data/types'
import { formatNumber } from '#/lib/format'

const WIDTH = 960
const HEIGHT = 470

const topology = countries110m as unknown as Topology<{ countries: GeometryCollection }>
const land = feature(topology, topology.objects.countries) as FeatureCollection
const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], land)
const path = geoPath(projection)
const outlines = land.features.map((f, i) => ({ id: String(f.id ?? i), d: path(f) ?? '' }))

/** Attack origins: one dot per source country, area proportional to event
 * volume. Clicking a dot opens the events from that country. */
export function WorldMap({ points }: { points: MapPoint[] }) {
  const navigate = useNavigate()
  const max = Math.max(1, ...points.map((p) => p.events))
  const dots = useMemo(
    () =>
      points
        .map((p) => {
          const [x, y] = projection([p.lon, p.lat]) ?? [0, 0]
          return { ...p, x, y, r: 4 + Math.sqrt(p.events / max) * 22 }
        })
        // Big dots first so small ones stay clickable on top.
        .sort((a, b) => b.r - a.r),
    [points, max],
  )

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label="Map of attack origins by country">
      <g fill="var(--color-background-muted)" stroke="var(--color-border)" strokeWidth={0.5}>
        {outlines.map((o) => (
          <path key={o.id} d={o.d} />
        ))}
      </g>
      {dots.map((dot) => (
        <circle
          key={dot.country}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill="var(--color-data-categorical-blue)"
          fillOpacity={0.55}
          stroke="var(--color-background-card)"
          strokeWidth={2}
          cursor="pointer"
          onClick={() => void navigate({ to: '/events', search: { country: dot.country } })}
        >
          <title>{`${dot.country}: ${formatNumber(dot.events)} events`}</title>
        </circle>
      ))}
    </svg>
  )
}
