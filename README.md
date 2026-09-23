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

Every page reads through `src/data/queries.ts`, which currently resolves seeded fixtures from `src/data/mock/`. Mock writes (acknowledge, save, mint, …) change in-memory state in the running tab; a full reload starts from the fixtures again.

```bash
VITE_MOCK_LATENCY_MS=800 bun run dev   # slow backend: see pending states
VITE_MOCK_FAIL=1 bun run dev           # failing backend: see error states
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
