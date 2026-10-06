from .model import Chapter, Challenge

BANDIT = "https://overthewire.org/wargames/bandit"

NOTES = r"""
### Core Concepts

- **Splitting:** The shell cuts your line into pieces. Generally, it cuts
  whenever it sees a space.
- **Reading errors:** Most Linux errors have the same structure:

        command name: what it was working on: the error it found

    Example:

        cat: my: No such file or directory

- **Quotes:** If there are single or double quotes around something, the shell
  ignores any spaces inside it. This is for the shell, not the program. Recall
  that the program never actually sees exactly what you typed.
- **Backslash:** A backslash protects only one character, the one right after
  it.
- **What `ls` shows you:** It may show quotes around a file name. Those quotes
  are not part of the file's name; they're just there to show you that
  whatever is inside them is one word.

### Core Commands to Research

| Command | What it does |
| --- | --- |
| `"..."` & `'...'` | Keep words with spaces together as one word. |
| `\` | Protects the next character. |
| `Tab` | Finishes what you were about to type if it finds a match. Press it twice if there is more than one file with the same starting letters, and it will show you all of them. |
"""

CHAPTER = Chapter(
    "spaces", "Spaces, the Shell's Knife",
    "Where the shell cuts your line, how to read the errors it leaves behind, and how quotes and backslashes keep a name in one piece.",
    notes=NOTES,
    video_id="vC7sSi8wxoQ",
    challenges=[
        Challenge("bandit-3", "Mission 3: Bandit Level 2 → 3", f"{BANDIT}/bandit3.html",
                  "Read a file whose name the shell cuts into pieces, then log in as bandit3."),
        Challenge("bandit-4", "Extra: Bandit Level 3 → 4", f"{BANDIT}/bandit4.html",
                  "Find a file that ls doesn't show you by default, then log in as bandit4."),
    ],
)
