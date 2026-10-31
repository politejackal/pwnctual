#!/usr/bin/env bash
#
# check_segfault.sh: compile vuln.c, run it, and print the flag only if it segfaults.
#
# Usage:
#   ./check_segfault.sh [args for the program...]
#   ./check_segfault.sh < payload.txt          # stdin is passed through to the program
#   python3 -c 'print("A"*200)' | ./check_segfault.sh

# ======================= CONFIG =======================
SRC="vuln.c"                 # source file to compile
BIN="./vuln"                 # output binary
CC="gcc"                     # compiler
# Protections off so classic memory bugs crash reliably. Don't add -fsanitize,
# because ASan catches the bug and exits normally instead of segfaulting.
CFLAGS="-g -O0 -fno-stack-protector -no-pie -w"
LDFLAGS=""

EXPECTED_SIGNALS="SEGV"      # signal names that count as a win (e.g. "SEGV BUS")
TIMEOUT=5                    # seconds before the program is killed (0 = no limit)
DISABLE_CORE_DUMPS=1         # 1 = don't leave core files lying around
# ======================================================

set -u

die() { echo "[!] $*" >&2; exit 1; }

# ===================== FLAG ===========================
# generate_flag prints the flag to stdout. It's only called after a confirmed
# crash, so swap in whatever logic you like here (decode it, assemble it from
# pieces, read it from a file, etc.). The rest of the script doesn't care how.
#
# Example of a lightly obfuscated version:
#   generate_flag() { echo "ZmxhZ3t5MHVfbTRkM18xdF9zM2dmNHVsdH0K" | base64 -d; }
generate_flag() {
    echo "flag{y0u_m4d3_1t_s3gf4ult}"
}
# ======================================================

# --- Compile ---
[ -f "$SRC" ] || die "Source file '$SRC' not found."
echo "[*] Compiling $SRC -> $BIN"
# shellcheck disable=SC2086  # CFLAGS/LDFLAGS are intentionally word-split
$CC $CFLAGS -o "$BIN" "$SRC" $LDFLAGS || die "Compilation failed."

# --- Run ---
[ "$DISABLE_CORE_DUMPS" = "1" ] && ulimit -c 0

echo "[*] Running $BIN $*"
if [ "$TIMEOUT" -gt 0 ] && command -v timeout >/dev/null 2>&1; then
    timeout --foreground "$TIMEOUT" "$BIN" "$@"
else
    "$BIN" "$@"
fi
status=$?

# --- Check result ---
if [ "$status" -eq 124 ] && [ "$TIMEOUT" -gt 0 ]; then
    die "Program timed out after ${TIMEOUT}s. No crash, no flag."
fi

if [ "$status" -le 128 ]; then
    echo "[-] Program exited normally (status $status). No segfault, no flag."
    exit 1
fi

sig_num=$((status - 128))
sig_name=$(kill -l "$sig_num" 2>/dev/null || echo "UNKNOWN")

for s in $EXPECTED_SIGNALS; do
    if [ "$sig_name" = "$s" ]; then
        echo "[+] Program crashed with SIG$sig_name (signal $sig_num). Nice!"
        generate_flag || die "Flag generation failed."
        exit 0
    fi
done

echo "[-] Program was killed by SIG$sig_name (signal $sig_num), not ${EXPECTED_SIGNALS}. No flag."
exit 1