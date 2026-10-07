# Deployment runbook

Owner: deployment operator. This expands the system; it does not change canonical traffic.

## Preconditions

- [Release gates](../release-gates.md) are green except the operator-only soak and rollback rehearsal.
- The environment runbook is complete.
- The target is an immutable `ghcr.io/xore/apiary-dashboard@sha256:…` digest with a verified GitHub attestation.
- Canonical remains deployed and its route is unchanged.

## Deploy

1. Verify provenance: `gh attestation verify oci://ghcr.io/xore/apiary-dashboard@sha256:<digest> --owner Xore`.
2. Pin the rewrite Arcane project to that digest. Give it its own Redis and the reviewed environment.
3. Pull and redeploy through the normal Arcane operation. Do not edit the canonical project.
4. Wait for the container health check, then run:

   ```bash
   curl -fsS https://next.dashboard.example.test/healthz
   test "$(curl -sS -o /dev/null -w '%{http_code}' https://next.dashboard.example.test/)" = 307
   test "$(curl -sS -o /dev/null -w '%{http_code}' https://next.dashboard.example.test/metrics)" = 401
   ```

5. Sign in as one viewer and one admin. Verify a live list, detail, mutation, download, report, and `/api/live` stream. Confirm viewer mutations are refused.
6. Record image digest, environment revision, Redis/Keycloak/backend health, smoke result, and timestamps in the change ticket.

## Failed deployment

If health, sign-in, authorization, or live data verification fails, leave canonical traffic unchanged. Preserve the failed rewrite instance and logs for diagnosis, or redeploy the last known rewrite digest. No data migration or rollback is required because this deployment owns no canonical data.
