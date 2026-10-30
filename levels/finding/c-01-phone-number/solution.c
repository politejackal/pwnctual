#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    char phone[32];

    printf("Enter your 9-digit phone number: ");
    if (scanf("%31s", phone) != 1) {
        printf("No phone number entered.\n");
        return 1;
    }

    if (strlen(phone) != 9) {
        printf("That's not a 9-digit phone number.\n");
        return 1;
    }
    for (int i = 0; i < 9; i++) {
        if (!isdigit((unsigned char)phone[i])) {
            printf("That's not a 9-digit phone number.\n");
            return 1;
        }
    }

    printf("Sending verification code to: %s\n", phone);
    return 0;
}
