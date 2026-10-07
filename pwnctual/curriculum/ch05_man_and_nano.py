from .model import Chapter

NOTES = r"""
I forgot to mention this in the video, but this makes a great task for you.
Using the `man` command, check out what the `nano` command is and what it does.
This is your side quest for today, good luck!
"""

CHAPTER = Chapter(
    "man-and-nano", "Reading the Manual",
    "Use man to look up what a command does, then go find out what nano is.",
    notes=NOTES,
    video_id="u3ex-lR63SI",
)
