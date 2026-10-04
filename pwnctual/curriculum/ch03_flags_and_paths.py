from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
### Core Concepts

- **Two translators:** The shell cuts your line into pieces at the spaces.
  Then the program decides what each piece means. A piece that starts with `-`
  is treated as a flag. Nobody enforces that rule; each program just assumes it.
- **Home directory:** The one folder that belongs to you. You land there when
  you log in. `~` is shorthand for it.
- **Paths:** A file's address. `/` separates folders. An absolute path starts
  with `/` and works from anywhere. A relative path starts from where you are.
- **Dot and dot dot:** `.` means this folder. `..` means the folder above.
- **Standard input:** What a program reads when you give it nothing else. By
  default, that's your keyboard. Many programs also read it when you hand them
  a lone `-` as a name.
- **Argument injection:** When text someone else controls reaches a command
  and gets read as a flag instead of a name.

### Core Commands to Research

- `man` - Read a command's manual. Arrow keys scroll, `/` searches, `q` quits.
- `cd ..` / `cd ~` - Go up one folder / go home.
- `./name` - "The file called name, in this folder."
- `--` - Tells most programs "no more flags after this." Unreliable for a file
  named `-`: a lone `-` isn't a flag, so `--` doesn't change what it means.
  `cat -- -` still reads your keyboard. A path to the file always works.
- `Ctrl+D` - "I'm done typing." Ends standard input.
- `Ctrl+C` - "Stop, right now." Kills the running program.

### Mission 2

- **Target:** [OverTheWire (Bandit Level 1 → Level 2)](https://overthewire.org/wargames/bandit/bandit2.html)
- **Objective:** Log in as `bandit1` with the password you found in Mission 1.
  The next password is in a file with an awkward name. Read it.
- **If it freezes:** If the terminal sits there doing nothing, the program
  is waiting on standard input. Press `Ctrl+C` and think about what the
  program saw.
- **Crucial Step:** Once you have the password, `exit` and log back in as
  `bandit2` with it.
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
