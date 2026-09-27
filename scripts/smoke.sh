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

step "the server refuses an environment that would open it"
refuses() {
  local code="$1"; shift
  if env -u SERVICE_TOKEN -u OIDC_DISABLED -u APIARY_ALLOW_UNAUTH_DEV "$@" PORT="$PORT" bun run start >"$WORK/refusal.log" 2>&1; then
    printf '  FAIL started anyway (%s)\n' "$code"; return 1
  fi
  if grep -q "$code" "$WORK/refusal.log"; then printf '  ok   refused with %s\n' "$code"; else printf '  FAIL no %s in the refusal\n' "$code"; return 1; fi
}
refuses E-SERVICE-TOKEN env
refuses E-OIDC-DISABLED env SERVICE_TOKEN=smoke OIDC_DISABLED=1 NODE_ENV=production

step "start production server on :$PORT"
SERVICE_TOKEN=smoke-token PORT="$PORT" bun run start >"$WORK/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 50); do
  curl -s -o /dev/null "http://localhost:$PORT/healthz" && break
  sleep 0.2
done

# Signed in as the operator through the mock identity provider.
signin() { curl -s -o /dev/null -D - "http://localhost:$PORT/auth/callback?code=mock&role=${1:-admin}" | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: \([^;]*\).*/\1/p'; }
COOKIE="$(signin admin)"
[[ -n "$COOKIE" ]] || { echo "sign-in failed"; exit 1; }

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
  "/sensors/conpot-s7-1200/exposure 200"
  "/investigate/cidr/198.51.100.0%2F26 301"
  "/investigate/cluster?kind=credential&value=root%3Atoor 301"
  "/ml-anomalies/anom-e1a6f09f39/triage 200"
  "/alerts/sensor%7CSensor%20suricata%20silent%20for%203h%2010m/evidence 200"
  "/recordings/89090804218391c1e01f60efae130436c0001cf6acbe087b582dd8dd5fc12bd5/attacker 200"
  "/tty-replay/89090804218391c1e01f60efae130436c0001cf6acbe087b582dd8dd5fc12bd5 301"
  "/reports/generated/rpt-8256dc8894 200"
  "/dead-letters/nope 404"
  "/iocs?kind=cve 200"
  "/ioc/cve/CVE-2017-0144/timeline 200"
  "/ioc/credential/root%3Atoor 200"
  "/investigate/lookup 301"
  "/watchlist 200"
  "/asn/AS9009/timeline 200"
  "/reports?step=library 301"
  "/reports/generate?template=threat 200"
  "/reports/history 200"
  "/reports/templates 200"
  "/reports/library 200"
  "/payload-workbench/results?tab=ghidra 200"
  "/settings?pane=services 307"
  "/sensors 307"
  "/sources/10.0.0.1 404"
  "/no-such-page 404"
  "/favicon.svg 200"
  "/healthz 200"
  "/export/portbridge-manual-blackhole.txt 200"
  "/export/portbridge-manual-blackhole.txt?mock=unavailable 502"
  "/auth/login 200"
  "/auth/login?fail=unavailable 200"
  "/auth/callback?code=expired 200"
  "/auth/callback?error=invalid_request 200"
  "/auth/callback?code=failed 200"
  "/auth/callback?code=mock&return_to=%2F%2Fevil.example.test 307"
  "/api/export/events.csv?sensor=cowrie 200"
  "/api/export/history.json?q=wget 200"
  "/api/export/nope 404"
  "/api/export/commands.csv?mock=unavailable 502"
  "/api/payload/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/download 200"
  "/api/payload/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/download?mock=viewer 403"
  "/api/recording/89090804218391c1e01f60efae130436c0001cf6acbe087b582dd8dd5fc12bd5/cast 200"
  "/api/recording/89090804218391c1e01f60efae130436c0001cf6acbe087b582dd8dd5fc12bd5/raw 200"
  "/api/report/rpt-8256dc8894/pdf 200"
  "/api/raw-report/github-analysis/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37 200"
  "/api/artifact/ghidra/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/decompiled.c 200"
  "/api/artifact/sandbox/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/host.pcap 200"
  "/api/artifact/ghidra/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/call-graph.svg 200"
  "/api/report/rpt-payload-320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37-x/pdf 200"
  "/api/report/rpt-unknown/pdf 404"
)

# Without a session: pages go to sign-in, direct handlers refuse, and only
# the infrastructure endpoints answer.
ANON_CHECKS=(
  "/ 307"
  "/events?kind=login 307"
  "/api/export/commands.csv 401"
  "/api/payload/320cbb5e902f6bc9d8ea8edd7974b7829b1e4f08f477b7e3aadb240c18e9cc37/download 401"
  "/api/live 401"
  "/healthz 200"
  "/export/portbridge-manual-blackhole.txt 200"
  "/auth/login 200"
)

step "HTTP checks, signed in"
failed=0
for check in "${CHECKS[@]}"; do
  path="${check% *}"
  want="${check##* }"
  got="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" "http://localhost:$PORT$path")"
  if [[ "$got" == "$want" ]]; then
    printf '  ok   %s %s\n' "$got" "$path"
  else
    printf '  FAIL %s %s (expected %s)\n' "$got" "$path" "$want"
    failed=1
  fi
done

step "HTTP checks, anonymous"
for check in "${ANON_CHECKS[@]}"; do
  path="${check% *}"
  want="${check##* }"
  got="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$PORT$path")"
  if [[ "$got" == "$want" ]]; then printf '  ok   %s %s\n' "$got" "$path"; else printf '  FAIL %s %s (expected %s)\n' "$got" "$path" "$want"; failed=1; fi
done

step "sign-out: same origin only, then the session is gone"
OTHER="$(signin viewer)"
check() { if [[ "$2" == "$3" ]]; then printf '  ok   %s %s\n' "$2" "$1"; else printf '  FAIL %s %s (expected %s)\n' "$2" "$1" "$3"; failed=1; fi; }
check "cross-site sign-out" "$(curl -s -o /dev/null -w '%{http_code}' -b "$OTHER" -H 'Referer: https://evil.example.test/' "http://localhost:$PORT/auth/logout")" 403
check "sign-out" "$(curl -s -o /dev/null -w '%{http_code}' -b "$OTHER" -H "Referer: http://localhost:$PORT/events" "http://localhost:$PORT/auth/logout")" 303
check "a page after sign-out" "$(curl -s -o /dev/null -w '%{http_code}' -b "$OTHER" "http://localhost:$PORT/events")" 307

step "SSR link crawl, every entity tab"
bun scripts/crawl.ts "http://localhost:$PORT" 2 || failed=1

step "every route shape under every mock scenario"
bun scripts/crawl.ts "http://localhost:$PORT" 1 --scenarios || failed=1

step "every kind of page at phone, tablet, laptop and 4K"
# Needs a browser; exit 2 means none was found and the check is skipped.
bun scripts/responsive.ts "http://localhost:$PORT"
case $? in 0 | 2) ;; *) failed=1 ;; esac

step "accessibility: WCAG 2.1 A/AA on every kind of page (docs/baselines)"
bun scripts/a11y.ts "http://localhost:$PORT"
case $? in 0 | 2) ;; *) failed=1 ;; esac

step "performance: page weight within the baseline (docs/baselines)"
bun scripts/perf.ts "http://localhost:$PORT"
case $? in 0 | 2) ;; *) failed=1 ;; esac

if [[ "$failed" -ne 0 ]]; then
  echo; echo "server log:"; tail -20 "$WORK/server.log"
  exit 1
fi
step "smoke passed"
