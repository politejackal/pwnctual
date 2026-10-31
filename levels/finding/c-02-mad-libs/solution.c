#include <stdio.h>

int main() {
    char name[20];
    char colour[20];
    char object[20];

    printf("=== WELCOME TO MAD LIBS 3000 ===\n");
    printf("Fill in the blanks and we'll write you a masterpiece!\n\n");

    printf("Please enter a name: ");
    if (scanf("%19s", name) != 1) {
        printf("No name entered.\n");
        return 1;
    }

    printf("Please enter a colour: ");
    if (scanf("%19s", colour) != 1) {
        printf("No colour entered.\n");
        return 1;
    }

    /* The fix: limit the read to 19 characters (+1 for the '\0'),
       exactly like the other two inputs. */
    printf("Please enter an object: ");
    if (scanf("%19s", object) != 1) {
        printf("No object entered.\n");
        return 1;
    }

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