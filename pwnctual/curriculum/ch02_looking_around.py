from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
*I forgot to mention this in the video.*

Here's the first thing which I personally feel nobody tells you: the shell
lies to the command. Like the SHELL, kind of lies to you. When you type a line
and hit Enter, the command you called never sees what you typed. The shell
grabs your line first, chops it into pieces, does its own edits, and only then
hands the leftovers to the program. Almost every "weird" thing or error you're
about to hit is really the shell doing something to your text before the
command ever wakes up.

Hold that thought. First, let's learn to walk.

### Core Commands to Research

- `pwd` - Where am I?
- `ls` - What is in this directory?
- `cd` - Move to a directory.
- `cat` - Read a file.
- `exit` - Close the current shell and disconnect.

### Mission 1

- **Target:** [OverTheWire (Bandit Level 0 → Level 1)](https://overthewire.org/wargames/bandit/bandit1.html)
- **Objective:** You know how to SSH. Now prove you can look around and read
  files on a target system. Go to
  [overthewire.org/wargames/bandit](https://overthewire.org/wargames/bandit)
  and follow the instructions there for Level 0 → Level 1.
- **Crucial Step:** Once you find the password for the next level, use the
  `exit` command to disconnect from your current SSH session. Then use SSH to
  log back in as the next user with the new password you just found.
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
