"""Data model for the pwnctual course.

Hierarchy:  Chapter  ->  Challenge

Every chapter is a YouTube lecture, a writeup that unlocks once the lecture is
watched, and a handful of OverTheWire challenges. Nothing is auto-checked:
when a learner says they finished a challenge, we take their word for it.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Challenge:
    slug: str
    title: str
    url: str       # the challenge page on OverTheWire
    brief: str     # one line on what the level is about, never the answer
    points: int = 10
    # filled in by the registry
    chapter: Optional["Chapter"] = None
    number: str = ""


@dataclass
class Chapter:
    id: str
    title: str
    summary: str
    video_id: str  # YouTube video ID of the lecture
    writeup: str   # markdown, shown after the lecture
    challenges: list = field(default_factory=list)
    number: int = 0

    @property
    def points(self):
        return sum(c.points for c in self.challenges)

    @property
    def video_url(self):
        return f"https://www.youtube.com/watch?v={self.video_id}"
