# Release gates

What #7 asks as proof that the rewrite can replace the canonical dashboard without losing behavior or security, and where each proof stands. **On mock** means the proof runs today against the mock backend, identity provider and session store. **Phase 2** means it needs the real tier: the Rust backend (#82 and the slice issues), Keycloak and Redis (#5).

`scripts/smoke.sh` is the release gate: a clean clone installs from the lockfile, then runs every check below that exists, against the production build.

| Proof | Evidence | Status |
|---|---|---|
| Route-tree and direct-handler parity | `scripts/route-matrix.ts` → `docs/migration/route-matrix.md`. `src/test/route-matrix.test.ts` fails when a canonical route has no row, a destination is not in the route tree, or the document is stale. | On mock. 45 implemented, 15 redirects, 3 pending (`metrics`, the two BFF seams: #5). |
| Source-to-destination traceability | `docs/migration/`: routes, server functions (153), shell behaviors (none left as gaps), slices. Each slice issue lists its routes and functions. | On mock. Ticked off per slice as it becomes real. |
| Authorization matrix: admin, viewer, anonymous | `src/server/authorize.ts` (the canonical permissions); `src/server/authorize.test.ts` runs every query as all three callers. Smoke checks direct handlers anonymous (401) and signed in. | On mock. The same matrix runs against real sessions in #5. |
| Browser acceptance | Smoke: the SSR link crawl (every entity tab), every route shape under every mock scenario (`crawl.ts --scenarios`, which includes expired sessions and the viewer role), `responsive.ts` at phone, tablet, laptop and 4K. Unit tests for lists, details, mutations, downloads and the live stream. | On mock. Mutations and downloads against the real backend come with each slice. |
| Backend unavailable | Mock scenarios `unavailable` (502) and `overloaded` (503), on pages, server functions, downloads, charts and `/api/live`. | On mock. |
| Session store (Redis) unavailable | `APIARY_MOCK_FAULTS=session-store`: requests are treated as signed out (pages go to sign-in, handlers 401), sign-in says it is unavailable or failed and sets no session, sign-out still clears the cookie. `src/server/faults.test.ts`; smoke starts a server with the fault. | On mock. The Redis store in #5 must keep the same contract. |
| Identity provider (Keycloak) unavailable | `APIARY_MOCK_FAULTS=identity-provider`: the sign-in page says sign-in is temporarily unavailable; the callback renders the failed exchange. Provider refusals and expired attempts render their own pages. | On mock. Real discovery and token-exchange failures in #5. |
| Invalid environment | The server refuses to boot without `SERVICE_TOKEN` (`E-SERVICE-TOKEN`) or with `OIDC_DISABLED=1` outside development (`E-OIDC-DISABLED`). `src/server/policy.test.ts`; smoke starts the server both ways. | On mock. |
| Unsafe cross-origin requests | Every server function passes the same-origin check; sign-out needs a same-origin Origin or Referer. `src/server/origin.test.ts`; smoke checks a cross-site sign-out (403). | On mock. CSP nonce: #5. |
| Production build and clean clone | Smoke clones, installs from the frozen lockfile, typechecks, lints, tests, builds, and starts `bun run start`; CI runs it on every pull request. The container image is built, boot-checked and scanned on every pull request (`container.yml`). | On mock. |
| Performance and accessibility baseline | `docs/baselines/`: axe (WCAG 2.1 A/AA) over 34 views; page weight and timings per page, within 25 %. Both in smoke. | On mock. Re-recorded once pages read real data. |
| Deployment, environment, cutover, rollback and legacy-removal runbooks | — | **Not started.** Needs the decisions below. |
| Rollback tested before traffic moves | — | Phase 2. |

## Decisions the runbooks need

1. **How the rewrite ships.** A container image built from this repository (Bun, `bun run start`), and where its build lives: beside the canonical frontend in the dashboard's compose project, or as its own project.
2. **How traffic moves.** One switch of the reverse-proxy route for the dashboard's host, or a period on a second host name with both running.
3. **Session continuity at cutover.** The cookie name and Redis layout are canonical's, so sessions could carry over if the rewrite reads the same Redis; otherwise everyone signs in again once.
4. **What rollback means.** Switching the route back, and how long the canonical frontend stays deployable after cutover before legacy removal.
