// One attacker identity as a hub and its member addresses as spokes: how
// wide the thing is at a glance. Spokes open the address; past the cap, the
// rest fold into one "+N more" node that opens the member list.
import { useState } from 'react'
import { Text } from '@astryxdesign/core/Text'
import { useNavigate } from '@tanstack/react-router'

const MAX_SPOKES = 24
const W = 640
const H = 420
const CX = W / 2
const CY = H / 2

export function AttackerGraph({ id, ips, membersHref }: { id: string; ips: string[]; membersHref: string }) {
  const navigate = useNavigate()
  const [hover, setHover] = useState<string>()
  const shown = ips.slice(0, MAX_SPOKES)
  const overflow = ips.length - shown.length
  const spokes: Array<{ key: string; label: string; href: string; overflow: boolean }> = [
    ...shown.map((ip) => ({ key: ip, label: ip, href: `/sources/${encodeURIComponent(ip)}`, overflow: false })),
    ...(overflow > 0 ? [{ key: 'overflow', label: `+${overflow} more`, href: membersHref, overflow: true }] : []),
  ]
  // Two rings once a single ring would crowd its labels.
  const rings = spokes.length > 12 ? 2 : 1
  const position = (i: number) => {
    const ring = rings === 2 ? i % 2 : 0
    const radius = rings === 2 ? (ring === 0 ? 110 : 165) : 140
    const angle = (i / spokes.length) * Math.PI * 2 - Math.PI / 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    // The label sits outward along the spoke, clear of the line, anchored
    // away from the hub.
    const out = radius + 16
    return {
      x: CX + cos * radius,
      y: CY + sin * radius,
      lx: CX + cos * out,
      ly: CY + sin * out + (sin > 0.3 ? 10 : sin < -0.3 ? -2 : 4),
      anchor: cos > 0.3 ? ('start' as const) : cos < -0.3 ? ('end' as const) : ('middle' as const),
    }
  }
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 720, display: 'block', margin: '0 auto' }} role="img" aria-label={`Attacker identity ${id.slice(0, 8)} and its ${ips.length} member addresses`}>
        {spokes.map((spoke, i) => {
          const { x, y } = position(i)
          return <line key={`e-${spoke.key}`} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-border-emphasized)" strokeWidth={hover === spoke.key ? 2 : 1} />
        })}
        {spokes.map((spoke, i) => {
          const { x, y, lx, ly, anchor } = position(i)
          const active = hover === spoke.key
          return (
            <g
              key={spoke.key}
              role="link"
              tabIndex={0}
              aria-label={spoke.overflow ? `${spoke.label} members` : `Source ${spoke.label}`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(spoke.key)}
              onMouseLeave={() => setHover(undefined)}
              onFocus={() => setHover(spoke.key)}
              onBlur={() => setHover(undefined)}
              onClick={() => void navigate({ href: spoke.href })}
              onKeyDown={(e) => e.key === 'Enter' && void navigate({ href: spoke.href })}
            >
              <circle cx={x} cy={y} r={spoke.overflow ? 16 : 9} fill={spoke.overflow ? 'var(--color-background-muted)' : 'var(--color-data-categorical-blue)'} stroke={active ? 'var(--color-text-primary)' : 'var(--color-background-card)'} strokeWidth={2} />
              <text x={lx} y={ly} textAnchor={anchor} fontSize={active ? 12 : 10} fontWeight={active ? 600 : 400} fill={active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'} style={{ fontFamily: 'var(--font-family-code, monospace)' }}>
                {spoke.label}
              </text>
            </g>
          )
        })}
        <circle cx={CX} cy={CY} r={30} fill="var(--color-text-primary)" />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--color-background-card)" style={{ fontFamily: 'var(--font-family-code, monospace)' }}>
          {id.slice(0, 8)}
        </text>
      </svg>
      <Text type="supporting">{`${ips.length} member ${ips.length === 1 ? 'address' : 'addresses'}. Open one for its own page${overflow > 0 ? `; the rest are in the member list` : ''}.`}</Text>
    </div>
  )
}
