#!/bin/bash
INPUT="$1"

if [ -z "$INPUT" ]; then
  echo "Usage: ./check.sh \"your input\""; exit 1
fi

gcc -o vuln vuln.c || exit 1

SENT=$(printf '%s\n' "$INPUT" | ./vuln | sed -n 's/.*Sending verification code to: //p')

echo "You entered:      $INPUT"
echo "Program sent to:  $SENT"
echo

if [ "$SENT" != "$INPUT" ]; then
  echo "You broke it! The code went to the wrong number."
  echo "pwnctual{9fvA3hhs2JDyR5J5jiL5j494}"
else
  echo "Same number. Keep trying."
fi
