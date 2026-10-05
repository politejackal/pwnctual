from .model import Chapter

NOTES = r"""
### Core Concepts

- **The Knife:** The shell cuts your line into pieces at every space. A
  filename with a space in it gets cut into two pieces, and the program goes
  looking for two files that don't exist.
- **Reading Errors:** Most Linux errors have the same shape: who is
  complaining: what it was working on: what went wrong. For example,
  `cat: my: No such file or directory`. The error shows you exactly how the
  shell cut your line. Read every word.
- **Quotes:** Text inside quotes stays one piece, spaces and all.
  `"my notes.txt"` and `'my notes.txt'` both work. The quotes are for the
  shell, which removes them, so the program never sees them.
- **The Backslash:** `\` protects only the next character. `my\ notes.txt`
  means "this space is part of the name, don't cut here."
- **What ls Shows You:** `ls` may show `'my notes.txt'` with quotes around
  it. Those quotes aren't part of the name. They just show where the name
  starts and ends.
- **Why It Matters:** When a program glues a user's text into a command
  without quotes, a space splits it into extra pieces. If one of those pieces
  starts with a dash, it becomes a flag. That's argument injection again.
  Watch for unquoted user text whenever you read code.

### Core Commands to Research

- `"..."` and `'...'` - Keep spaces inside one piece.
- `\` - Protect the next character.
- `Tab` - Finish a filename for you. Press it twice to see every match.
"""

CHAPTER = Chapter(
    "under-the-knife", "Under the Knife",
    "Where the shell cuts your line, how to read the errors it leaves behind, and how quotes and backslashes keep a name in one piece.",
    notes=NOTES,
)
