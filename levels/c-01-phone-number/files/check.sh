#!/bin/bash
INPUT="$1"

if [ -z "$INPUT" ]; then
  echo "Usage: ./check.sh \"your input\""; exit 1
fi

if [ ! -x ./vuln ]; then
  echo "Compile it first: gcc -o vuln vuln.c"; exit 1
fi

OUTPUT=$(printf '%s\n' "$INPUT" | ./vuln 2>/dev/null)
PRINTED=$(printf '%s' "$OUTPUT" | sed -n 's/.*Sending verification code to: //p' | tr -d '[:space:]')
EXPECTED=$(printf '%s' "$INPUT" | tr -d '[:space:]')

echo "You entered:      $EXPECTED"
echo "Program sent to:  $PRINTED"

if [ "$PRINTED" != "$EXPECTED" ]; then
  echo
  echo "You broke it! The code went to the wrong number."
  echo "pwnctual{phone_number_is_not_an_int}"
else
  echo
  echo "Same number. The program handled that one correctly. Keep trying."
fi
