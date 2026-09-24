#!/usr/bin/env bash
# Clean-clone smoke test: clone, install from the lockfile, run every gate,
# then start the Bun production server and check key routes over HTTP.
#
# Usage: scripts/smoke.sh [git-url-or-path] [ref]
#   defaults to this repository's origin and the current branch.
set -euo pipefail

SRC="${1:-$(git remote get-url origin)}"
REF="${2:-$(git rev-parse --abbrev-ref HEAD)}"
PORT="${SMOKE_PORT:-3199}"
WORK="$(mktemp -d)"
SERVER_PID=""

cleanup() {
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

step() { printf '\n==> %s\n' "$*"; }

step "clone $SRC @ $REF"
git clone --quiet --depth 1 --branch "$REF" "$SRC" "$WORK/app"
cd "$WORK/app"

step "install (frozen lockfile)"
bun install --frozen-lockfile

step "typecheck";  bunx tsc --noEmit
step "lint";       bun run lint
step "unit tests"; bun run test
step "theme outputs match source"; bun run theme:check
step "build";      bun run build

step "start production server on :$PORT"
PORT="$PORT" bun run start >"$WORK/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 50); do
  curl -fs -o /dev/null "http://localhost:$PORT/" && break
  sleep 0.2
done

# path  expected-status
CHECKS=(
  "/ 200"
  "/events?kind=login 200"
  "/sources/198.51.100.13 200"
  "/sources/198.51.100.13/timeline?range=7d 200"
  "/payloads/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/sandbox 200"
  "/investigate/ip/198.51.100.13 301"
  "/campaigns/198.51.100.0%2F26/why 200"
  "/networks/198.51.100.0%2F26 200"
  "/asn/AS9009 200"
  "/sensors/cowrie-home-01/exposure 200"
  "/investigate/cidr/198.51.100.0%2F26 301"
  "/investigate/cluster?kind=credential&value=root%3Atoor 301"
  "/ml-anomalies/anom-e1a6f09f39/triage 200"
  "/alerts/sensor%7CSensor%20suricata-vps-01%20silent%20for%203h%2010m/evidence 200"
  "/recordings/89090804218391c1e01f60efae130436c0001cf6acbe087b582dd8dd5fc12bd5/attacker 200"
  "/tty-replay/89090804218391c1e01f60efae130436c0001cf6acbe087b582dd8dd5fc12bd5 301"
  "/reports/generated/rpt-8256dc8894 200"
  "/dead-letters/nope 404"
  "/reports?step=library 200"
  "/payload-workbench/results?tab=ghidra 200"
  "/settings?pane=services 307"
  "/sensors 307"
  "/sources/10.0.0.1 404"
  "/no-such-page 404"
)

step "HTTP checks"
failed=0
for check in "${CHECKS[@]}"; do
  path="${check% *}"
  want="${check##* }"
  got="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$path")"
  if [[ "$got" == "$want" ]]; then
    printf '  ok   %s %s\n' "$got" "$path"
  else
    printf '  FAIL %s %s (expected %s)\n' "$got" "$path" "$want"
    failed=1
  fi
done

if [[ "$failed" -ne 0 ]]; then
  echo; echo "server log:"; tail -20 "$WORK/server.log"
  exit 1
fi
step "smoke passed"
