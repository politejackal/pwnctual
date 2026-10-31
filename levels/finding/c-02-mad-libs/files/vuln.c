#include <stdio.h>

int main() {
    char name[20];
    char colour[20];
    char object[20];

    printf("=== WELCOME TO MAD LIBS 3000 ===\n");
    printf("Fill in the blanks and we'll write you a masterpiece!\n\n");

    printf("Please enter a name: ");
    scanf("%19s", name);

    printf("Please enter a colour: ");
    scanf("%19s", colour);

    printf("Please enter an object: ");
    scanf("%s", object);

    printf("\n--- THE LEGEND OF %s ---\n\n", name);
    printf("Once upon a time, a brave hero named %s woke up and discovered\n", name);
    printf("that their entire body had turned %s overnight.\n", colour);
    printf("\"This is fine,\" said %s, calmly eating a %s for breakfast.\n", name, object);
    printf("The neighbours screamed. The cat filed a formal complaint.\n");
    printf("Desperate for answers, %s consulted the ancient and wise %s,\n", name, object);
    printf("which replied only with: \"Have you tried turning yourself off and on again?\"\n");
    printf("And so %s lived %s-ly ever after, never trusting a %s again.\n\n", name, colour, object);
    printf("THE END.\n");

    return 0;
}