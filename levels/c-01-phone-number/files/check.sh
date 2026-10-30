#!/bin/bash
INPUT="$1"

if [ -z "$INPUT" ]; then
  echo "Usage: ./check.sh \"your input\""; exit 1
fi

gcc -o vuln vuln.c || exit 1

OUTPUT=$(printf '%s\n' "$INPUT" | ./vuln 2>/dev/null)
PRINTED=$(printf '%s' "$OUTPUT" | sed -n 's/.*Sending verification code to: //p' | tr -d '[:space:]')
EXPECTED=$(printf '%s' "$INPUT" | tr -d '[:space:]')

echo "You entered:      $EXPECTED"
echo "Program sent to:  $PRINTED"

if [ "$PRINTED" != "$EXPECTED" ]; then
  echo
  echo "You broke it! The code went to the wrong number."
  echo "pwnctual{9fvA3hhs2JDyR5J5jiL5j494}"
else
  echo
  echo "Same number. The program handled that one correctly. Keep trying."
fi
