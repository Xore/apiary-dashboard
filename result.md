## Result: partial failure

| Check | Result |
|---|---|
| Arcane deployment | Pass |
| Latest published image | Pass |
| Health endpoint | Pass |
| Real-data-only invariant | **Fail** |
| Keycloak login | Pass |

- Arcane project `apiary-dashboard` is `running`, with `2/2` services running.
- Last GitOps sync: `success`, no error, commit `b72a887bf13ec029b219400db5c0b9ff74f41314`.
- Dashboard container is healthy with `0` restarts.
- Running image: `ghcr.io/xore/apiary-dashboard:v0.1.0@sha256:02e50bd9124414314ddef6246249b0ed9d098dc420c4dd7581862ad0362c82bd`.
- Both registry tags `latest` and `v0.1.0` resolve to that digest. GitHub’s latest release is `v0.1.0`.

Configuration is production-like:

```text
BACKEND_URL=http://backend-service:8081
APIARY_ALLOW_UNAUTH_DEV=<unset>
```

Endpoint verification:

- `GET https://beta.xore.rocks/healthz` → `200`, body `ok`.
- `GET /export/portbridge-manual-blackhole.txt` → `200`, empty body.
- Direct backend request returned the same status, size, and SHA-256, confirming the unmodified request currently uses real backend data.

Critical issue: the deployed release does not enforce “no mock fixtures.”

- `?mock=normal` returns the known 25-byte mock fixture instead of the empty backend response.
- `?mock=unavailable` returns the simulated `502`.
- The deployed `v0.1.0` code also silently falls back to mock data when some live reads fail.
- This affects production despite `APIARY_ALLOW_UNAUTH_DEV` being unset.
- The fix exists on `fix/production-no-mock` at `6380c42`, but is not included in any published/deployed image.

Keycloak verification passed:

- `/` redirects to `/auth/login`.
- `/auth/login` redirects to the expected Keycloak realm with `https://beta.xore.rocks/auth/callback`.
- OIDC discovery returns `200`.
- Logs contain `auth_callback_completed` at `2026-10-08T22:09:18.776Z`. One expired callback occurred 56 seconds earlier, followed by the successful login.

Next step: release the `fix/production-no-mock` change as `v0.1.1`, redeploy it through Arcane, then rerun the `?mock=normal` and `?mock=unavailable` probes.