#!/usr/bin/env bash
# Checks your fix for this level.
#
#   ./check.sh
#
# Builds vuln.c, runs it, then calls check_pin() with a range of PINs.
# Only 1337 may get access. Prints PASS and a flag if every test passes.

set -u
cd "$(dirname "$0")" || exit 1

if [ -t 1 ]; then
    GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
    GREEN=""; RED=""; DIM=""; BOLD=""; RESET=""
fi

export ASAN_OPTIONS="detect_leaks=0"
CFLAGS="-g -O0 -fsanitize=address,undefined -fno-sanitize-recover=all"

# sha256 of stdin, on Linux (sha256sum) or macOS (shasum)
sha256() {
    if command -v sha256sum >/dev/null 2>&1; then sha256sum; else shasum -a 256; fi | cut -d' ' -f1
}

passed=0
failed=0
outputs=""   # results of passing tests; the flag is built from them

pass() { passed=$((passed + 1)); outputs="$outputs|$2"; echo "  ${GREEN}ok${RESET}    $1"; }
fail() { failed=$((failed + 1)); echo "  ${RED}FAIL${RESET}  $1 ${DIM}($2)${RESET}"; }

echo "${BOLD}Building vuln.c${RESET}"
if ! make --no-print-directory -B vuln >build.log 2>&1; then
    cat build.log
    rm -f build.log
    echo
    echo "${RED}${BOLD}FAIL${RESET} vuln.c doesn't compile. Fix the errors above and run ./check.sh again."
    exit 1
fi
rm -f build.log

# A small test program that calls your check_pin() directly. Your main() is
# renamed out of the way so this one can run instead.
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
cat >"$workdir/pin_test.c" <<'EOF'
#include <stdio.h>
#include <stdlib.h>
int check_pin(int entered_pin);
int main(int argc, char **argv) {
    for (int i = 1; i < argc; i++) {
        int pin = (int)strtol(argv[i], NULL, 10);
        printf("%d\n", check_pin(pin) != 0);
    }
    return 0;
}
EOF
if ! { gcc $CFLAGS -Dmain=original_main -c -o "$workdir/vuln.o" vuln.c &&
       gcc $CFLAGS -o "$workdir/pin_test" "$workdir/vuln.o" "$workdir/pin_test.c"; } >"$workdir/build.log" 2>&1; then
    cat "$workdir/build.log"
    echo
    echo "${RED}${BOLD}FAIL${RESET} Couldn't build the PIN tests. Keep check_pin() taking an int and returning an int."
    exit 1
fi

echo
echo "${BOLD}The program${RESET}"
expected=$'Testing with wrong PIN (0000): 0\nTesting with right PIN (1337): 1'
output="$(./vuln 2>&1)"
if [ "$output" = "$expected" ]; then
    pass "./vuln prints 0 for the wrong PIN and 1 for the right one" "$output"
else
    fail "./vuln prints 0 for the wrong PIN and 1 for the right one" "got: $(printf '%s' "$output" | tr '\n' ' ' | cut -c1-80)"
fi

echo
echo "${BOLD}PINs${RESET}"
pins="1337 0 1 1234 1336 1338 7331 13370 -1337 2147483647 -2147483648"
results="$("$workdir/pin_test" $pins 2>&1)"
i=1
for pin in $pins; do
    got="$(printf '%s\n' "$results" | sed -n "${i}p")"
    if [ "$pin" = "1337" ]; then want=1; else want=0; fi
    if [ "$want" = 1 ]; then label="PIN $pin gets access"; else label="PIN $pin is refused"; fi
    if [ "$got" = "$want" ]; then
        pass "$label" "$pin=$got"
    elif [ "$got" = 1 ]; then
        fail "$label" "it got access"
    elif [ "$got" = 0 ]; then
        fail "$label" "it was refused"
    else
        fail "$label" "check_pin() crashed or printed something unexpected"
    fi
    i=$((i + 1))
done

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
