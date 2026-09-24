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
