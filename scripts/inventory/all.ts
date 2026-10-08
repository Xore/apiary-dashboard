// Regenerates the whole canonical inventory in docs/migration/ from the
// pinned tree, in dependency order: server functions, then routes (which
// read the functions), then the slice annotations on both, the slice table
// and the route matrix.
//
//   git -C <APIARY> archive 62ee45d arcane/home/honeypot-dashboard/frontend-next | tar -x -C /tmp/canon
//   bun scripts/inventory/all.ts /tmp/canon/arcane/home/honeypot-dashboard/frontend-next
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderMatrix } from '../route-matrix'
import { renderComponentMatrix } from '../component-matrix'
import { renderRoutes, routeInventory } from './routes'
import { inventory, renderInventory } from './server-functions'
import { rewriteOwners, sliceOfFn, sliceOfRoute, sliceRef } from './slice-map'
import { renderSlices } from './slices'

const root = process.argv[2]
if (!root) {
  console.error('usage: bun scripts/inventory/all.ts <canonical frontend-next dir>')
  process.exit(1)
}
const out = join(import.meta.dirname, '..', '..', 'docs/migration')
const write = (name: string, text: string) => writeFileSync(join(out, name), text)

const fns = inventory(root)
const routes = routeInventory(root, fns)
write('server-functions.json', `${JSON.stringify(fns, null, 2)}\n`)
write('routes.json', `${JSON.stringify(routes, null, 2)}\n`)
write('server-functions.md', renderInventory(fns, (fn) => sliceRef(sliceOfFn(fn, routes)), (fn) => rewriteOwners(sliceOfFn(fn, routes), fn)))
write('routes.md', renderRoutes(routes, (route) => sliceRef(sliceOfRoute(route))))
write('slices.md', renderSlices(fns, routes))
write('route-matrix.md', renderMatrix())
write('components.md', renderComponentMatrix())
console.log(`${fns.length} server functions, ${routes.length} page routes, inventory written`)
