from .model import Chapter, Challenge

NOTES = r"""
So now we are going to be doing some cool business. First of all, before
starting to write C, know that we will be writing C in the terminal. Yes, your
Linux terminal. On Windows, you can get a Linux terminal through WSL; on Mac, I
don't remember the exact name, but yeah, it's quite easy too.

So, once you are inside the Linux terminal, we need to set some things up. Just
enter the following commands. I would suggest not to copy-paste and rather type
them yourself, because this gives you the habit of typing into the terminal, and
you will be using these commands a lot.

```
sudo apt update
```

This refreshes the list of available packages so you get the latest versions, a
common practice.

```
sudo apt install make gcc
```

This is again invoking `sudo`, short for "superuser do", and telling it to run
`apt`, short for Advanced Package Tool, and telling `apt` to download `gcc` and
`make`. We will discuss what these mean later.

Now it might ask for your password and confirmations, just do it.

### Libraries

Now, first of all, when writing C, we include some libraries. What are
libraries? Well, just a bunch of code which somebody else wrote, and we tell the
compiler that we are going to be using it. The format to tell the program that
is `#include <filename>`. Quite easy.

So the first line looks like this:

```c
#include <filename>
```

Libraries are basically just files.

So the library we are going to be using here is `stdio.h`, which is also known
as the standard input/output library.

I'm tired of typing and can't keep up with what's coming into my head, all the
cool stuff to say, so I am shifting from write-ups to "say-ups" or something.
From the next chapter onwards, we will have videos, because I feel that's better
too.
"""

PRINT_SOMETHING = r"""
You can refer to the code from the video. It just prints `hello`:

```c
#include <stdio.h>

int main(void) {
    printf("hello\n");
    return 0;
}
```

Unlike other cool platforms, we will not be having a checker to check your
code. In vulnerability research, there is nobody there to check the scripts you
wrote. You must find out yourself whether your script is working or not. But we
will tell you what to check for:

- `gcc` compiles your file without printing any errors.
- When you run your program, your text shows up in the terminal.
- The next prompt starts on a new line, not glued to the end of your text.

Once all three are true, press **I finished it**.
"""

CHAPTER = Chapter(
    "setting-up-for-c", "Setting Up for C",
    "Install gcc and make in your terminal, and meet your first library.",
    notes=NOTES,
    video_id="MVwIK4CMNDI",
    challenges=[
        Challenge("print-something", "Mission 4: Print Something", "",
                  "Write a C program whose whole target in life is to print something. Anything.",
                  platform="Your terminal", details=PRINT_SOMETHING),
        Challenge("exercism-c-hello-world", "Extra: Hello, World! in C",
                  "https://exercism.org/tracks/c/exercises/hello-world",
                  "Make a C function hand back the classic greeting and pass the tests.",
                  platform="Exercism"),
    ],
)
