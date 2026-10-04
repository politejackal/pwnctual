from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
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
    challenges=[
        Challenge("bandit-1", "Mission 1: Bandit Level 0 → 1", f"{BANDIT}/bandit1.html",
                  "Look around the server, read the file holding the next password, then log in as bandit1."),
    ],
)
