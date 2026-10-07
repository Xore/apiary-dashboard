# Dashboard migration runbooks

Run these in order. Host names in examples are placeholders; substitute the approved deployment values.

1. [Environment](environment.md) — create secrets, Keycloak, Redis, backend, and proxy configuration.
2. [Deployment](deployment.md) — deploy an immutable rewrite image without changing canonical traffic.
3. [Cutover](cutover.md) — soak, rehearse rollback, and switch the main route.
4. [Rollback](rollback.md) — return traffic to canonical without changing data.
5. [Legacy removal](legacy-removal.md) — separately approved cleanup after the compatibility window.

Do not start cutover while [release-gates.md](../release-gates.md) says **NO-GO**.
