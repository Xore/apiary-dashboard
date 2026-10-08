# Legacy-removal runbook

Owner: platform owner. This is the destructive contract phase and requires a separate approved issue and pull request. Cutover approval does not authorize it.

## Preconditions

- Rewrite has served the main host for seven uninterrupted days with no rollback.
- No release gate, incident, or accepted-deviation expiry is open.
- Logs show no canonical traffic except explicit probes.
- Owners have confirmed no other service reads canonical session Redis, image, compose service, routes, files, timers, or CI jobs.
- The last canonical image digest and deployment configuration are recorded and retained for one release cycle.

## Remove

1. Remove the soak-host route.
2. In the APIARY repository, inventory all references to `frontend-next`, its compose service, image, Redis, proxy routes, CI, documentation, and timers. Port or separately track anything still used.
3. Submit the removal as its own reviewable pull request. Do not combine it with unrelated cleanup.
4. After approval, remove the canonical frontend service and only then remove its dedicated Redis if the ownership check proves no remaining reader or writer.
5. Verify rewrite health, sign-in, live data, metrics, and rollback artifact availability after deployment.

If verification fails, restore the retained canonical deployment configuration and image. Deleting the retained image is a later registry-retention decision, not part of this runbook.
