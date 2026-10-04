from .model import Chapter

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
  default, that's your keyboard.
- **Argument injection:** When text someone else controls reaches a command
  and gets read as a flag instead of a name.

### Core Commands to Research

- `man` - Read a command's manual. Arrow keys scroll, `/` searches, `q` quits.
- `cd ..` / `cd ~` - Go up one folder / go home.
- `./name` - "The file called name, in this folder."
- `--` - Tells most programs "no more flags after this."
- `Ctrl+D` - "I'm done typing." Ends standard input.
- `Ctrl+C` - "Stop, right now." Kills the running program.
"""

CHAPTER = Chapter(
    "flags-and-paths", "Flags & Paths",
    "How the shell and the program split up your line, how paths work, and the keys that end or stop a program.",
    notes=NOTES,
)
