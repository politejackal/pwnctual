"""Data model for the pwnctual curriculum.

The course is a list of chapters. Each chapter is one lesson: a recorded
video, a written explanation of it, then live challenges hosted elsewhere
(e.g. OverTheWire). Learners mark each challenge done themselves; if they get
stuck they read the man pages or ask in the video's comments.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Challenge:
    slug: str
    title: str
    points: int
    url: str  # where the live challenge is hosted
    description: str = ""
    # filled in by the registry
    chapter: Optional["Chapter"] = None
    number: str = ""


@dataclass
class Chapter:
    id: str
    title: str
    summary: str
    video: str  # recording URL (YouTube links are embedded); empty until it's published
    lecture: str  # the written explanation, in Markdown
    challenges: list = field(default_factory=list)
    number: int = 0

    @property
    def points(self):
        return sum(c.points for c in self.challenges)
