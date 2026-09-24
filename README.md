# APIARY Dashboard Rewrite

Clean-room dashboard rewrite using TanStack Start, Bun, and Astryx.

Planning and progress:

- [Implementation epic](https://github.com/Xore/apiary-dashboard/issues/1)
- [Upstream APIARY epic](https://github.com/Xore/APIARY/issues/3279)
- [Canonical running implementation](https://github.com/Xore/APIARY/tree/main/arcane/home/honeypot-dashboard/frontend-next)

The canonical implementation is a behavioral reference, not a component source to copy mechanically. Every migration slice must trace its routes, data, actions, security, and states before being rebuilt with current TanStack and Astryx conventions.

Current stage: UI-first. The dashboard is built against mock data first; real data, server functions, and auth are wired afterwards per route slice.

## Development

```bash
bun install
bun run dev          # vite dev server on :3009
bunx tsc --noEmit    # typecheck
bun run lint
bun run test
bun run build        # production build into dist/
bun run start        # Bun production server (server.ts)
bun run smoke        # clean clone → install → every gate → start → HTTP checks
```

`bun run test` covers nav roll-ups, formatters, and invariants over the mock data seam: numbers shown on different pages must agree, and every id one page links to must resolve on its target page.

### Mock data

Every page reads through `src/data/queries.ts`: the seeded implementation in `src/data/queries.impl.ts` (fixtures in `src/data/mock/`), run through the active mock scenario. Mock writes (acknowledge, save, mint, …) change in-memory state in the running tab; a full reload starts from the fixtures again.

**Scenarios** make the whole backend behave a given way, so every page's empty, error, loading and role-limited states can be seen. Pick one from the **Mock data** button in the top bar, or add `?mock=<scenario>` to any URL; it sticks while you navigate.

| `?mock=` | What the backend does |
|---|---|
| `empty` | No data yet: every list empty, every count zero (catalogs and KPI tiles stay, at zero) |
| `slow` | Every call takes 2.5 s: pending skeletons |
| `partial` | The same third of the reads fail with 502 on every visit; the rest answer |
| `unavailable` | Every call fails with 502 |
| `overloaded` | Every call is shed with 503 and Retry-After: 30 |
| `expired` | Every call answers 401: session expired |
| `viewer` | Signed in without admin: admin actions are disabled and refused with 403 |

`bun scripts/crawl.ts <url> 1 --scenarios` opens one page of every route shape under each scenario and fails on a page that crashes or shows the wrong state; smoke runs it. The scenario is process state on the dev server, so it is a single-designer tool, not something to share.

```bash
VITE_MOCK_LATENCY_MS=800 bun run dev   # extra latency on every call, any scenario
VITE_MOCK_FAIL=1 bun run dev           # every call fails, without a scenario
```

In dev, TanStack devtools open with **Ctrl+~** (the floating trigger is hidden so it never covers page actions).

## Stack notes

- Routing: TanStack Router file routes in `src/routes/`; `src/routeTree.gen.ts` is generated.
- UI: Astryx components (see `AGENTS.md` for the CLI workflow — `bunx astryx build "<idea>"`).
- Theme: editable neutral theme in `src/themes/neutral/`. Edit `neutralTheme.ts` (the annotated `theme.template.ts` documents every field), then:

  ```bash
  bun run theme:build   # regenerates neutral.css / neutral.js / neutral.d.ts
  bun run theme:check   # fails if the committed outputs are stale (part of smoke)
  ```

  The theme CLI runs under Bun (`bunx --bun`) so the icon registry's JSX uses the project's automatic runtime. Palette changes start from `palette.config.json` via `bunx astryx theme palette generate`.
