// Test harness for this level. check.sh builds it together with your vuln.c
// (with your main() renamed, so this one runs instead) and reads what it prints.
//
// Each line: <pin> <expected> <got>, where 1 means access granted.
#include <stdio.h>
#include <limits.h>

int check_pin(int entered_pin);

static const struct { int pin; int expected; } cases[] = {
    { 1337,     1 },  // the admin PIN
    { 0,        0 },
    { 1,        0 },
    { 1234,     0 },
    { 1336,     0 },  // one below
    { 1338,     0 },  // one above
    { 7331,     0 },  // the digits reversed
    { 13370,    0 },
    { -1337,    0 },
    { INT_MAX,  0 },
    { INT_MIN,  0 },
};

int main(void) {
    for (size_t i = 0; i < sizeof cases / sizeof cases[0]; i++) {
        int got = check_pin(cases[i].pin) != 0;
        printf("%d %d %d\n", cases[i].pin, cases[i].expected, got);
    }
    return 0;
}
