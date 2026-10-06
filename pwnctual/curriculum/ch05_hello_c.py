from .model import Chapter, Challenge

NOTES = r"""
### Why C?

Most of the programs you've been poking at on Linux, including the shell
itself, are written in C. C hands you the machine's memory directly and trusts
you not to make mistakes. When you do make one, someone else can often use it
to break in. You have to read C before you can find those mistakes.

### Your First Program

```c
#include <stdio.h>

int main(void) {
    printf("Hello, World!\n");
    return 0;
}
```

- `#include <stdio.h>` pulls in the standard input/output functions, such as `printf`.
- `main` is where every C program starts.
- `printf` prints text. `\n` ends the line.
- `return 0;` tells whoever ran the program that everything went fine.

### Core Commands to Research

| Command | What it does |
| --- | --- |
| `gcc hello.c -o hello` | Compiles `hello.c` into a program called `hello`. |
| `./hello` | Runs the program in the current directory. |
| `echo $?` | Shows the number the last program returned. |
"""

CHAPTER = Chapter(
    "hello-c", "Hello, C",
    "Write, compile and run your first C program, and see why hackers read C.",
    notes=NOTES,
    challenges=[
        Challenge("exercism-c-hello-world", "Mission 4: Hello, World! in C",
                  "https://exercism.org/tracks/c/exercises/hello-world",
                  "Make a C function hand back the classic greeting and pass the tests.",
                  platform="Exercism"),
    ],
)
