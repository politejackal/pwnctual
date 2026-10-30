#include <stdio.h>

int main() {
    int phone;

    printf("Enter your 10-digit phone number: ");
    scanf("%d", &phone);

    printf("Sending verification code to: %d\n", phone);
    return 0;
}
