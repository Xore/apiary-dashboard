// The decompiled functions as a call graph: callers above their callees, in
// layers from the entry points down. Selecting a function keeps it and its
// direct neighbours lit and dims the rest; the filter dims every function
// whose name does not match. Function names come from the sample, so they
// are drawn as SVG text, never as markup.
import { useMemo, useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import type { GhidraFunction } from '#/data/types'
import { NODE_H, NODE_W, layout, shortName } from '#/lib/callGraphLayout'

export function CallGraph({ functions, selected, onSelect }: { functions: GhidraFunction[]; selected?: string; onSelect: (name: string) => void }) {
  const [filter, setFilter] = useState('')
  const { width, height, pos } = useMemo(() => layout(functions), [functions])
  const byName = new Map(functions.map((f) => [f.name, f]))
  const focus = selected ? byName.get(selected) : undefined
  const near = focus ? new Set([focus.name, ...focus.callers, ...focus.callees]) : undefined
  const needle = filter.trim().toLowerCase()
  const lit = (name: string) => (!near || near.has(name)) && (!needle || name.toLowerCase().includes(needle))

  return (
    <VStack gap={2}>
      <TextInput label="Filter functions" isLabelHidden placeholder="Filter by name" size="sm" width={240} value={filter} onChange={setFilter} />
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Call graph of the decompiled functions">
          <defs>
            <marker id="cg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--color-border-emphasized)" />
            </marker>
          </defs>
          {functions.flatMap((f) =>
            f.callees
              .filter((c) => pos.has(c))
              .map((c) => {
                const a = pos.get(f.name)!
                const b = pos.get(c)!
                const on = lit(f.name) && lit(c) && (!focus || f.name === focus.name || c === focus.name)
                return <line key={`${f.name}->${c}`} x1={a.x + NODE_W / 2} y1={a.y + NODE_H} x2={b.x + NODE_W / 2} y2={b.y} stroke="var(--color-border-emphasized)" strokeWidth={on && focus ? 2 : 1} opacity={on ? 1 : 0.2} markerEnd="url(#cg-arrow)" />
              }),
          )}
          {functions.map((f) => {
            const p = pos.get(f.name)!
            const isSelected = f.name === selected
            const on = lit(f.name)
            return (
              <g key={f.name} role="button" tabIndex={0} aria-pressed={isSelected} aria-label={`Function ${f.name}`} style={{ cursor: 'pointer' }} opacity={on ? 1 : 0.25} onClick={() => onSelect(f.name)} onKeyDown={(e) => e.key === 'Enter' && onSelect(f.name)}>
                <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={6} fill={isSelected ? 'var(--color-data-categorical-blue)' : 'var(--color-background-muted)'} stroke={isSelected ? 'var(--color-data-categorical-blue)' : 'var(--color-border-emphasized)'} />
                <text x={p.x + NODE_W / 2} y={p.y + 17} textAnchor="middle" fontSize={11} fill={isSelected ? 'var(--color-background-card)' : 'var(--color-text-primary)'} style={{ fontFamily: 'var(--font-family-code, monospace)' }}>
                  {shortName(f.name)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <Text type="supporting">{focus ? `${focus.name}: called by ${focus.callers.length || 'nothing'}, calls ${focus.callees.length || 'nothing'}. Select another function, or the same one again to clear.` : 'Select a function to see only its callers and callees.'}</Text>
    </VStack>
  )
}
