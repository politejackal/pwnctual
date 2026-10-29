#!/usr/bin/env bash
# Checks your fix for this level.
#
#   ./check.sh
#
# Builds vuln.c with the sanitizers, then runs two sets of tests:
#   functional: normal input. The program must still do its job.
#   attack:     hostile input. The program must not crash, trip a sanitizer,
#               or print the wrong thing.
# Prints PASS only if every test passes.

set -u
cd "$(dirname "$0")" || exit 1

if [ -t 1 ]; then
    GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
    GREEN=""; RED=""; DIM=""; BOLD=""; RESET=""
fi

# Leak checks aren't part of this level
export ASAN_OPTIONS="detect_leaks=0"
export UBSAN_OPTIONS="print_stacktrace=1"

# Stop a test after 5 seconds. macOS has no `timeout`, so fall back to perl.
if command -v timeout >/dev/null 2>&1; then
    limit() { timeout 5 "$@"; }
elif command -v gtimeout >/dev/null 2>&1; then
    limit() { gtimeout 5 "$@"; }
else
    limit() { perl -e 'alarm shift; exec @ARGV' 5 "$@"; }
fi

# repeat CHAR COUNT: prints CHAR COUNT times
repeat() { printf "%*s" "$2" "" | tr ' ' "$1"; }

# show LABEL TEXT: one line of output, cut short if long, with its length
show() {
    local text="$2" more=""
    [ "${#text}" -gt 60 ] && more="..."
    echo "        ${DIM}$1: ${text:0:60}$more (${#text} characters)${RESET}"
}

echo "${BOLD}Building vuln.c${RESET}"
if ! make --no-print-directory -B vuln >build.log 2>&1; then
    cat build.log
    rm -f build.log
    echo
    echo "${RED}${BOLD}FAIL${RESET} vuln.c doesn't compile. Fix the errors above and run ./check.sh again."
    exit 1
fi
rm -f build.log

passed=0
failed=0

# run_test KIND NAME INPUT EXPECTED_OUTPUT
run_test() {
    local kind="$1" name="$2" input="$3" expected="$4"
    local output status problem="" errfile
    errfile="$(mktemp)"
    # $( ) drops trailing newlines from both sides, so compare without them
    output="$(printf '%s' "$input" | limit ./vuln 2>"$errfile")"
    status=$?

    if grep -qE 'AddressSanitizer|UndefinedBehaviorSanitizer|runtime error:' "$errfile"; then
        problem="memory error: $(grep -m1 -oE '(AddressSanitizer|UndefinedBehaviorSanitizer): [a-z-]+|runtime error: .*' "$errfile" | cut -c1-80)"
    elif [ "$status" -eq 124 ] || [ "$status" -eq 142 ]; then
        problem="took longer than 5 seconds"
    elif [ "$status" -gt 128 ]; then
        problem="crashed (signal $((status - 128)))"
    elif [ "$status" -ne 0 ]; then
        problem="exited with code $status"
    elif [ "$output" != "$expected" ]; then
        problem="wrong output"
    fi

    if [ -z "$problem" ]; then
        passed=$((passed + 1))
        echo "  ${GREEN}ok${RESET}    $kind: $name"
    else
        failed=$((failed + 1))
        echo "  ${RED}FAIL${RESET}  $kind: $name ${DIM}($problem)${RESET}"
        if [ "$problem" = "wrong output" ]; then
            show "expected" "$expected"
            show "got     " "$output"
        fi
    fi
    rm -f "$errfile"
}

echo
echo "${BOLD}Functional tests${RESET}"
run_test functional "short name"           $'Ada\n'           "Hello, Ada!"
run_test functional "name with a space"    $'Ada Lovelace\n'  "Hello, Ada Lovelace!"
run_test functional "empty line"           $'\n'              "Hello, !"
run_test functional "no newline at end"    'Grace'            "Hello, Grace!"
run_test functional "255 characters"       "$(repeat x 255)"$'\n' "Hello, $(repeat x 255)!"

echo
echo "${BOLD}Attack tests${RESET}"
run_test attack "256 characters"           "$(repeat A 256)"$'\n'   "Hello, $(repeat A 255)!"
run_test attack "300 characters"           "$(repeat A 300)"$'\n'   "Hello, $(repeat A 255)!"
run_test attack "10,000 characters"        "$(repeat A 10000)"$'\n' "Hello, $(repeat A 255)!"
run_test attack "10,000 characters, no newline" "$(repeat B 10000)" "Hello, $(repeat B 255)!"

echo
total=$((passed + failed))
if [ "$failed" -eq 0 ]; then
    echo "${GREEN}${BOLD}PASS${RESET} All $total tests passed. Tick \"I solved it\" on the level page."
    exit 0
else
    echo "${RED}${BOLD}FAIL${RESET} $failed of $total tests failed. Edit vuln.c and run ./check.sh again."
    exit 1
fi
