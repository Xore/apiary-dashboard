import { useMemo } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countries110m from 'world-atlas/countries-110m.json'
import { useNavigate } from '@tanstack/react-router'
import type { MapPoint } from '#/data/types'
import { formatNumber } from '#/lib/format'
import { usePreferences } from '#/lib/prefs'

const WIDTH = 960
const HEIGHT = 470

const topology = countries110m as unknown as Topology<{ countries: GeometryCollection }>
const land = feature(topology, topology.objects.countries) as FeatureCollection
const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], land)
const path = geoPath(projection)
const outlines = land.features.map((f, i) => ({ id: String(f.id ?? i), d: path(f) ?? '' }))

/** Origins closer than this (map units) merge into one marker when
 * clustering is on. */
const CLUSTER_DISTANCE = 36
const PULSING = 5

type Dot = MapPoint & { x: number; y: number; r: number }
type Marker = { key: string; x: number; y: number; r: number; events: number; countries: string[] }

/** Greedy clustering, biggest first: each dot joins the first marker whose
 * centre is within reach, or starts its own. */
function cluster(dots: Dot[], max: number): Marker[] {
  const markers: Marker[] = []
  for (const dot of dots) {
    const near = markers.find((m) => Math.hypot(m.x - dot.x, m.y - dot.y) < CLUSTER_DISTANCE)
    if (near) {
      const total = near.events + dot.events
      near.x = (near.x * near.events + dot.x * dot.events) / total
      near.y = (near.y * near.events + dot.y * dot.events) / total
      near.events = total
      near.countries.push(dot.country)
      near.r = 4 + Math.sqrt(total / max) * 22
    } else markers.push({ key: dot.country, x: dot.x, y: dot.y, r: dot.r, events: dot.events, countries: [dot.country] })
  }
  return markers
}

/** Attack origins: one marker per source country (or per cluster of nearby
 * countries, as the operator prefers), area proportional to event volume.
 * Clicking one opens the events from there. The busiest pulse, unless the
 * operator turned map animation off or asked for reduced motion. */
export function WorldMap({ points }: { points: MapPoint[] }) {
  const navigate = useNavigate()
  const prefs = usePreferences()
  const clustering = prefs?.mapClustering ?? true
  const animate = (prefs?.mapAnimation ?? true) && prefs?.motion !== 'on'
  const max = Math.max(1, ...points.map((p) => p.events))
  const markers = useMemo(() => {
    const dots: Dot[] = points
      .map((p) => {
        const [x, y] = projection([p.lon, p.lat]) ?? [0, 0]
        return { ...p, x, y, r: 4 + Math.sqrt(p.events / max) * 22 }
      })
      .sort((a, b) => b.r - a.r)
    const list = clustering ? cluster(dots, max) : dots.map((d) => ({ key: d.country, x: d.x, y: d.y, r: d.r, events: d.events, countries: [d.country] }))
    // Big markers first so small ones stay clickable on top.
    return list.sort((a, b) => b.r - a.r)
  }, [points, max, clustering])
  const busiest = new Set([...markers].sort((a, b) => b.events - a.events).slice(0, PULSING).map((m) => m.key))

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label="Map of attack origins by country">
      <g fill="var(--color-background-muted)" stroke="var(--color-border)" strokeWidth={0.5}>
        {outlines.map((o) => (
          <path key={o.id} d={o.d} />
        ))}
      </g>
      {markers.map((m) => (
        <g key={m.key} cursor="pointer" onClick={() => void navigate({ to: '/events', search: { country: m.countries.join(',') } })}>
          {animate && busiest.has(m.key) && (
            <circle cx={m.x} cy={m.y} r={m.r} fill="none" stroke="var(--color-data-categorical-blue)" strokeWidth={2}>
              <animate attributeName="r" from={m.r} to={m.r + 14} dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={m.x} cy={m.y} r={m.r} fill="var(--color-data-categorical-blue)" fillOpacity={0.55} stroke="var(--color-background-card)" strokeWidth={2}>
            <title>{m.countries.length > 1 ? `${m.countries.join(', ')}: ${formatNumber(m.events)} events` : `${m.countries[0]}: ${formatNumber(m.events)} events`}</title>
          </circle>
          {m.countries.length > 1 && (
            <text x={m.x} y={m.y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--color-text-primary)" pointerEvents="none">
              {m.countries.length}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
