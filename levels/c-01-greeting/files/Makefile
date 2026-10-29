# Builds ./vuln with AddressSanitizer and UndefinedBehaviorSanitizer, so memory
# bugs stop the program with a report instead of going unnoticed.
#
#   make              build
#   make CC=clang     build with clang instead of gcc
#   make clean        remove the binary

CC = gcc
CFLAGS = -g -O0 -Wall -Wextra -fsanitize=address,undefined -fno-sanitize-recover=all -fno-omit-frame-pointer

vuln: vuln.c
	$(CC) $(CFLAGS) -o $@ $<

clean:
	rm -f vuln

.PHONY: clean
