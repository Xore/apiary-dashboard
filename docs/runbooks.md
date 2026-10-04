# Runbooks

How the rewrite goes live in place of the canonical dashboard, and how it goes back. The decisions behind them are recorded in [release-gates.md](release-gates.md#decisions). Host names here are placeholders: `dashboard.example.test` is the dashboard's public host, and `next.dashboard.example.test` is the second host used during the soak.

## Deployment

The rewrite ships as **its own Arcane project**, separate from the canonical dashboard project. Canonical stays exactly as it is until cutover.

1. Merge to `main`. `container.yml` builds the image, checks that it boots, scans it, and pushes `ghcr.io/xore/apiary-dashboard` (`:main`, and `:vX.Y.Z` for a version tag). Nothing deploys automatically.
2. The project's compose file runs that image, pinned to a version tag. The project also has **its own Redis** for sessions.
3. Deploy: pull the image, then redeploy the project through Arcane's API.
4. Verify:
   - The container is freshly created and `(healthy)`. The image's `HEALTHCHECK` calls `/healthz`.
   - `GET /healthz` returns 200.
   - A page while signed out redirects (307) to `/auth/login`.
   - `GET /metrics` with `x-service-token` returns 200, and without it returns 401.

## Environment

`.env.example` lists every variable. For a deployed instance:

| Variable | Deployed value |
|---|---|
| `SERVICE_TOKEN` | The secret shared with backend-service. Required: the server refuses to boot without it (`E-SERVICE-TOKEN`). |
| `APIARY_ALLOW_UNAUTH_DEV`, `APIARY_DEV_HTTP_COOKIE`, `OIDC_DISABLED`, `APIARY_MOCK_FAULTS` | **Unset.** Development only. `OIDC_DISABLED=1` refuses to boot (`E-OIDC-DISABLED`). |
| `EXTERNAL_URL` | The public origin the instance is served under, which changes at cutover (below). |
| `LIVE_MAX_STREAMS`, `BFF_EVENT_LOOP_SHED_MS` | The defaults (500 streams, 250 ms) unless `/metrics` shows sheds under normal load. |
| `DASHBOARD_BFF_LOG_FILE` | A path on a volume that Filebeat tails. |
| `PORT` | `3000`, as the image sets it. |

The identity provider and Redis variables are added with #5. Their values come from the new project's own Redis and its own Keycloak client. That client needs the redirect URIs of both host names.

## Cutover

Traffic moves in two steps: first a **soak on a second host name with both dashboards running**, then **one route switch**.

1. **Soak.** Add a Traefik router for `next.dashboard.example.test` that points at the rewrite, with `EXTERNAL_URL=https://next.dashboard.example.test`. Canonical keeps serving `dashboard.example.test`. Edit the live `traefik/dynamic.yml` surgically; never overwrite it from the repository copy.
2. During the soak, the operators use the second host for their normal work. Watch `/metrics` (`bff_sheds_total`, `bff_named_events_total{name="auth_callback_failed"}`) and the container logs. Re-run `scripts/smoke.sh` and the parity checks in [release-gates.md](release-gates.md) against the deployed instance.
3. **Before the switch, test rollback** (next section) on the second host: point its router back at canonical and confirm sign-in and a page load. Then point it at the rewrite again.
4. **Switch.**
   1. Set `EXTERNAL_URL=https://dashboard.example.test` on the rewrite and redeploy it.
   2. Change the `dashboard.example.test` router's service from canonical to the rewrite.
   3. Keep the second host's router until legacy removal.
5. **Sessions do not carry over.** The rewrite has its own Redis, so everyone signs in once after the switch. Tell the operators beforehand.
6. Verify on the main host: `/healthz` returns 200, signing out redirects to `/auth/login`, a sign-in completes, `/live` streams, and a detail page loads real data.

## Rollback

Rollback means **switching the route back**. Canonical stays deployed and untouched for **7 days after cutover**.

1. Change the `dashboard.example.test` router's service back to canonical. Traefik reloads `dynamic.yml` without a restart.
2. Everyone signs in once more, because canonical's Redis never saw the rewrite's sessions.
3. Leave the rewrite running behind the second host so the failure can be reproduced, and open an issue describing it.
4. Every time traffic goes back to canonical, the 7-day clock for legacy removal starts again.

## Legacy removal

Do this once the rewrite has served the main host for 7 days without a rollback.

1. Remove the second host's router from `dynamic.yml`.
2. In the APIARY repository, open an issue and a PR that remove the canonical frontend (`frontend-next`) from the dashboard project: its compose service, its build, and any references (CI, docs, timers). Grep the whole repository first. Anything that turns out to be used elsewhere is ported or filed as its own issue, not dropped. backend-service stays: the rewrite reads through it.
3. Remove canonical's session Redis if nothing else uses it.
4. Keep the last canonical image tag in the registry for one release cycle. After that, rollback means redeploying that tag.
