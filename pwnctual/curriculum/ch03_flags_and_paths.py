from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
*I forgot to mention something in the video again 😭*

The `-` is explicitly used to read standard input in many programs, so using
`--` is not reliable for this. That's because `--` says "whatever comes after
this is not a flag," but `-` is not being treated as a flag. It's being treated
as something that says to wait for input.

### Core Concepts

- **Splitting:** The shell cuts your input into pieces. How does it know where
  to cut? Well, wherever there are spaces, by default.
- **Home directory:** Every user on the device has one. It's their default
  folder, which contains all their stuff. `~` is the shorthand for it.
- **Paths:** A path is like a file's address, separated by `/`. A path starting
  with a slash is an absolute path, and a path not starting with a `/` is a
  relative path.
- **`.` and `..`:** Special names for your current folder and the folder in
  which your current folder is located, respectively.
- **Standard input:** When a program is waiting for some input, it is waiting
  for standard input from somewhere. By default, this is your keyboard.
- **Argument injection:** When somebody's input, which was intended to be used
  as something else (like a file name), ends up being treated as an argument of
  a program (like a flag).

### Core Commands

| Command | What it does |
| --- | --- |
| `man` | Reads the manual of any command (that has one, but don't worry, most do!). Try `man man`. |
| `cd ..` / `cd ~` | Go one folder up / go to your home folder, respectively. Just using `cd` takes you to your home directory by default. |
| `./name` | "This file called name, right here in this folder." |
| `--` | I mentioned it above :) |
| `Ctrl + D` | "I'm done typing." Ends standard input here. |
| `Ctrl + C` | "Just stfu and stop immediately." Kills the running program :) |
"""

CHAPTER = Chapter(
    "flags-and-paths", "Flags & Paths",
    "How the shell and the program split up your line, how paths work, and the keys that end or stop a program.",
    notes=NOTES,
    video_id="-_LtIy-JOH4",
    challenges=[
        Challenge("bandit-2", "Mission 2: Bandit Level 1 → 2", f"{BANDIT}/bandit2.html",
                  "Read a file whose name the program mistakes for something else, then log in as bandit2."),
    ],
)
