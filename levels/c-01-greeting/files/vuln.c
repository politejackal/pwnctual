#include <stdio.h>
#include <string.h>

#define MAX_NAME 256

/* Reads one line from stdin into buf. */
static void read_line(char *buf) {
    int c;
    int i = 0;

    while ((c = getchar()) != EOF && c != '\n') {
        buf[i++] = (char)c;
    }
    buf[i] = '\0';
}

int main(void) {
    char name[MAX_NAME];
    char greeting[MAX_NAME + 16];

    read_line(name);

    strcpy(greeting, "Hello, ");
    strcat(greeting, name);
    strcat(greeting, "!");

    puts(greeting);
    return 0;
}
