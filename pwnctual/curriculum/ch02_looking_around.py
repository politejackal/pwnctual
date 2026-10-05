from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
*I forgot to mention this in the video.*

The shell actually manipulates the data you give it and then hands it over to
the command. For example, if you type `my notes.txt` in the shell, it takes it
and chops it wherever it finds spaces. This changes your input of
`my notes.txt` into `my` and `notes.txt`. Well, we'll come back to this in a
while, so for now you should just know that the shell manipulates the given
data.

### Basic Commands

| Command | Short for | What it does |
| --- | --- | --- |
| `pwd` | print working directory | Prints what it says ;) |
| `ls` | list | Lists the files/<wbr>directories. |
| `cd` | change directory | Does what it says :) |
| `cat` | concatenate | Reads a file. |
| `exit` | — | Exits the current shell connection, or in other words, disconnects you from the current connection. |
"""

CHAPTER = Chapter(
    "looking-around", "Looking Around",
    "Find where you are, list what's there, move between directories, read files, and log out cleanly.",
    notes=NOTES,
    video_id="XvSwE3jIzTQ",
    challenges=[
        Challenge("bandit-1", "Mission 1: Bandit Level 0 → 1", f"{BANDIT}/bandit1.html",
                  "Look around the server, read the file holding the next password, then log in as bandit1."),
    ],
)
