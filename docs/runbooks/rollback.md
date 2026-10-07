# Rollback runbook

Owner: incident commander. Rollback is a proxy route change; it does not restore or rewrite application data.

## Trigger

Rollback for failed sign-in, incorrect authorization, silent or wrong live data, sustained backend/Redis/Keycloak errors, broken critical workflows, or an accessibility/performance regression that blocks operation.

## Procedure

1. Change the `dashboard.example.test` proxy service from rewrite back to the still-running canonical service.
2. Verify canonical `/healthz`, sign-in, a live list/detail, and one safe read from backend-service.
3. Announce that users must sign in again; canonical and rewrite Redis stores do not share sessions.
4. Leave the rewrite reachable only on the soak host. Preserve its image digest, environment revision, logs, metrics, and Redis until evidence is captured.
5. Open an incident/issue with the failed gate, first bad timestamp, request IDs, scope, and reproduction. Never attach secrets or session cookies.
6. Reset the seven-day compatibility clock. A later cutover repeats the full soak and rollback rehearsal.

## If canonical also fails

Treat it as a shared backend, identity, or platform incident. Do not delete or repoint either deployment while triaging. Restore the shared dependency first, then verify both dashboards independently.
