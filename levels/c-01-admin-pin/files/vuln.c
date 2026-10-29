#include <stdio.h>

int check_pin(int entered_pin) {
    int is_authenticated = 0;

    if (entered_pin = 1337) {
        is_authenticated = 1;
    }

    return is_authenticated;
}

int main() {
    printf("Testing with wrong PIN (0000): %d\n", check_pin(0000));
    printf("Testing with right PIN (1337): %d\n", check_pin(1337));
    return 0;
}
