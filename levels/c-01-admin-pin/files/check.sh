#!/usr/bin/env bash
# Checks your fix for this level.
#
#   ./check.sh
#
# 1. Builds and runs vuln.c.
# 2. Builds checker/harness.c with your check_pin() and tries the PINs listed
#    there. Only 1337 may get access.
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

# sha256 of stdin, on Linux (sha256sum) or macOS (shasum)
sha256() {
    if command -v sha256sum >/dev/null 2>&1; then sha256sum; else shasum -a 256; fi | cut -d' ' -f1
}

passed=0
failed=0
outputs=""   # results of passing tests; the flag is built from them

pass() { passed=$((passed + 1)); outputs="$outputs|$2"; echo "  ${GREEN}ok${RESET}    $1"; }
fail() { failed=$((failed + 1)); echo "  ${RED}FAIL${RESET}  $1 ${DIM}($2)${RESET}"; }

stop() {
    echo
    echo "${RED}${BOLD}FAIL${RESET} $1"
    exit 1
}

# Build everything in a temporary folder so nothing is left behind here
build="$(mktemp -d)"
trap 'rm -rf "$build"' EXIT

echo "${BOLD}Building${RESET}"
if ! $CC $CFLAGS -o "$build/vuln" vuln.c 2>"$build/log"; then
    cat "$build/log"
    stop "vuln.c doesn't compile. Fix the errors above and run ./check.sh again."
fi
# Same code again, with main() renamed so the harness's main() runs instead
if ! { $CC $CFLAGS -Dmain=original_main -c -o "$build/vuln.o" vuln.c &&
       $CC $CFLAGS -o "$build/harness" "$build/vuln.o" checker/harness.c; } 2>"$build/log"; then
    cat "$build/log"
    stop "Couldn't build the tests. Keep check_pin() taking an int and returning an int."
fi

echo
echo "${BOLD}The program${RESET}"
expected=$'Testing with wrong PIN (0000): 0\nTesting with right PIN (1337): 1'
output="$("$build/vuln" 2>&1)"
if [ "$output" = "$expected" ]; then
    pass "./vuln prints 0 for the wrong PIN and 1 for the right one" "$output"
else
    fail "./vuln prints 0 for the wrong PIN and 1 for the right one" "got: $(printf '%s' "$output" | tr '\n' ' ' | cut -c1-80)"
fi

echo
echo "${BOLD}PINs${RESET} ${DIM}(from checker/harness.c)${RESET}"
if ! results="$("$build/harness" 2>&1)"; then
    printf '%s\n' "$results" | head -20
    stop "check_pin() crashed. See the error above."
fi
while read -r pin want got; do
    if [ "$want" = 1 ]; then label="PIN $pin gets access"; else label="PIN $pin is refused"; fi
    if [ "$got" = "$want" ]; then
        pass "$label" "$pin=$got"
    elif [ "$got" = 1 ]; then
        fail "$label" "it got access"
    else
        fail "$label" "it was refused"
    fi
done <<EOF
$results
EOF

echo
total=$((passed + failed))
if [ "$failed" -eq 0 ]; then
    flag="pwnctual{admin-pin-$(printf 'c-01-admin-pin%s' "$outputs" | sha256 | cut -c1-16)}"
    echo "${GREEN}${BOLD}PASS${RESET} All $total tests passed."
    echo
    echo "Your flag: ${BOLD}$flag${RESET}"
    echo "Enter it on the level page to mark the level as solved."
    exit 0
else
    echo "${RED}${BOLD}FAIL${RESET} $failed of $total tests failed. Edit vuln.c and run ./check.sh again."
    exit 1
fi
