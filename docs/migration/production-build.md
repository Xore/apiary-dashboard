# Production build verification

The release artifact is the Vite production output served by `bun run server.ts`; the container builds the same output with Bun 1.4.2.

## Reproducible check

```bash
scripts/smoke.sh <git-url-or-path> <branch-or-tag>
```

The script creates a clean temporary clone, runs `bun install --frozen-lockfile`, typecheck, lint, all tests, generated-theme verification, `bun run build`, boot-policy refusals, `bun run start`, HTTP checks, route/scenario crawls, responsive checks, accessibility, and performance. CI runs the same script from a temporary branch on every pull request.

## Result

- `bun run build`: PASS on 2026-10-08.
- Clean clone → frozen install → build → production start and HTTP checks: PASS on 2026-10-08 for `migration/7-parity-proof`.
- Container build, boot check, Trivy scan, SBOM, and provenance: enforced by `.github/workflows/container.yml`; the pull request check is the authoritative artifact result.

No build output is committed. A release pins the image digest that passed the pull request gates; a mutable tag is not sufficient evidence.
