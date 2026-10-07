from .model import Chapter

NOTES = r"""
I messed up something in the video. It's a small fix, but an important one for
hackers: it stores around 4 billion values, not 8 billion. That works out to
about -2 billion to +2 billion. Awesome!

I won't be typing out everything I say, haha, except when we're on something
confusing or when you need some special notes (like the one above 💀). See you
in the next video!
"""

CHAPTER = Chapter(
    "data-types-in-c", "Data Types in C",
    "The different types of data C can hold.",
    notes=NOTES,
    video_id="d_DDuvNNU6M",
)
