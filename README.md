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
```

In dev, TanStack devtools open with **Ctrl+~** (the floating trigger is hidden so it never covers page actions).

## Stack notes

- Routing: TanStack Router file routes in `src/routes/`; `src/routeTree.gen.ts` is generated.
- UI: Astryx components (see `AGENTS.md` for the CLI workflow — `bunx astryx build "<idea>"`).
- Theme: editable neutral theme in `src/themes/neutral/`, built from `theme.template.ts`.
