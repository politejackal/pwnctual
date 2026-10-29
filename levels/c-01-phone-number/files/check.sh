#!/usr/bin/env bash
# Checks your fix for this level.
#
#   ./check.sh
#
# Builds vuln.c, then types each phone number from checker/cases.txt into it.
# Every number must come back out exactly as it went in.
# Prints PASS and a flag if every test passes.

set -u
cd "$(dirname "$0")" || exit 1

if [ -t 1 ]; then
    GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
    GREEN=""; RED=""; DIM=""; BOLD=""; RESET=""
fi

CC="${CC:-gcc}"
CFLAGS="-g -O0 -fsanitize=address,undefined -fno-sanitize-recover=all"
export ASAN_OPTIONS="detect_leaks=0"

# Stop a test after 5 seconds. macOS has no `timeout`, so fall back to perl.
if command -v timeout >/dev/null 2>&1; then
    limit() { timeout 5 "$@"; }
else
    limit() { perl -e 'alarm shift; exec @ARGV' 5 "$@"; }
fi

# sha256 of stdin, on Linux (sha256sum) or macOS (shasum)
sha256() {
    if command -v sha256sum >/dev/null 2>&1; then sha256sum; else shasum -a 256; fi | cut -d' ' -f1
}

passed=0
failed=0
outputs=""   # results of passing tests; the flag is built from them

pass() { passed=$((passed + 1)); outputs="$outputs|$2"; echo "  ${GREEN}ok${RESET}    $1"; }
fail() { failed=$((failed + 1)); echo "  ${RED}FAIL${RESET}  $1 ${DIM}($2)${RESET}"; }

# Build in a temporary folder so nothing is left behind here
build="$(mktemp -d)"
trap 'rm -rf "$build"' EXIT

echo "${BOLD}Building${RESET}"
if ! $CC $CFLAGS -o "$build/vuln" vuln.c 2>"$build/log"; then
    cat "$build/log"
    echo
    echo "${RED}${BOLD}FAIL${RESET} vuln.c doesn't compile. Fix the errors above and run ./check.sh again."
    exit 1
fi

echo
echo "${BOLD}Phone numbers${RESET} ${DIM}(from checker/cases.txt)${RESET}"
while read -r number; do
    case "$number" in ''|'#'*) continue ;; esac
    output="$(printf '%s\n' "$number" | limit "$build/vuln" 2>"$build/err")"
    status=$?
    if grep -qE 'AddressSanitizer|UndefinedBehaviorSanitizer|runtime error:' "$build/err"; then
        fail "$number" "memory error: $(grep -m1 -oE '(AddressSanitizer|UndefinedBehaviorSanitizer): [a-z-]+|runtime error: .*' "$build/err" | cut -c1-70)"
    elif [ "$status" -ne 0 ]; then
        fail "$number" "exited with code $status"
    else
        # The prompt has no newline, so this text can follow it on the same line
        sent="$(printf '%s\n' "$output" | sed -n 's/.*Sending verification code to: //p' | head -1)"
        if [ "$sent" = "$number" ]; then
            pass "$number" "$number"
        else
            fail "$number" "sent the code to ${sent:-nothing}"
        fi
    fi
done < checker/cases.txt

echo
total=$((passed + failed))
if [ "$failed" -eq 0 ]; then
    flag="pwnctual{phone-number-$(printf 'c-01-phone-number%s' "$outputs" | sha256 | cut -c1-16)}"
    echo "${GREEN}${BOLD}PASS${RESET} All $total tests passed."
    echo
    echo "Your flag: ${BOLD}$flag${RESET}"
    echo "Enter it on the level page to mark the level as solved."
    exit 0
else
    echo "${RED}${BOLD}FAIL${RESET} $failed of $total tests failed. Edit vuln.c and run ./check.sh again."
    exit 1
fi
