// The call graph's layout, shared by the interactive graph and its SVG
// export: callers above their callees, in layers from the entry points down.
import type { GhidraFunction } from '#/data/types'

export const NODE_W = 132
export const NODE_H = 26
export const GAP_X = 20
export const GAP_Y = 56
export const PAD = 16

/** Layer = longest distance from an entry point, so every edge points down. */
export function layers(functions: GhidraFunction[]): string[][] {
  const byName = new Map(functions.map((f) => [f.name, f]))
  const depth = new Map<string, number>()
  const visit = (name: string, d: number, seen: Set<string>) => {
    if (seen.has(name)) return // recursion: stop at the cycle
    if ((depth.get(name) ?? -1) >= d) return
    depth.set(name, d)
    for (const callee of byName.get(name)?.callees ?? []) if (byName.has(callee)) visit(callee, d + 1, new Set(seen).add(name))
  }
  const roots = functions.filter((f) => f.callers.every((c) => !byName.has(c)))
  for (const root of roots.length ? roots : functions.slice(0, 1)) visit(root.name, 0, new Set())
  for (const f of functions) if (!depth.has(f.name)) depth.set(f.name, 0)
  const out: string[][] = []
  for (const [name, d] of depth) (out[d] ??= []).push(name)
  return out.map((row) => row.sort())
}

/** Where each function sits, and the canvas it needs. */
export function layout(functions: GhidraFunction[]) {
  const rows = layers(functions)
  const width = Math.max(...rows.map((r) => r.length)) * (NODE_W + GAP_X) - GAP_X + PAD * 2
  const height = rows.length * (NODE_H + GAP_Y) - GAP_Y + PAD * 2
  const pos = new Map<string, { x: number; y: number }>()
  rows.forEach((row, d) => {
    const rowWidth = row.length * (NODE_W + GAP_X) - GAP_X
    row.forEach((name, i) => pos.set(name, { x: (width - rowWidth) / 2 + i * (NODE_W + GAP_X), y: PAD + d * (NODE_H + GAP_Y) }))
  })
  return { width, height, pos }
}

export const shortName = (name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name)

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** The graph as a standalone SVG file: no script, fixed colours. */
export function callGraphSvg(functions: GhidraFunction[]): string {
  const { width, height, pos } = layout(functions)
  const edges = functions.flatMap((f) =>
    f.callees
      .filter((c) => pos.has(c))
      .map((c) => {
        const a = pos.get(f.name)!
        const b = pos.get(c)!
        return `<line x1="${a.x + NODE_W / 2}" y1="${a.y + NODE_H}" x2="${b.x + NODE_W / 2}" y2="${b.y}" stroke="#9aa0a6" marker-end="url(#arrow)"/>`
      }),
  )
  const nodes = functions.map((f) => {
    const p = pos.get(f.name)!
    return `<g><title>${escapeXml(f.name)} @ ${escapeXml(f.address)}</title><rect x="${p.x}" y="${p.y}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="#f1f3f4" stroke="#9aa0a6"/><text x="${p.x + NODE_W / 2}" y="${p.y + 17}" text-anchor="middle" font-family="monospace" font-size="11" fill="#202124">${escapeXml(shortName(f.name))}</text></g>`
  })
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    '<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9aa0a6"/></marker></defs>',
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    ...edges,
    ...nodes,
    '</svg>',
    '',
  ].join('\n')
}
