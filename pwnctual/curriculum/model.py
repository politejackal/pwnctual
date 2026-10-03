"""Data model for the pwnctual course.

Hierarchy:  Chapter  ->  Challenge

Every chapter is a YouTube lecture, a writeup that unlocks once the lecture is
watched, and a handful of OverTheWire challenges. A chapter can be just a video
(Chapter 0, the roadmap) or have no video yet (its writeup and challenges are
then open straight away). Nothing is auto-checked:
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
    writeup: str = ""   # markdown, shown after the lecture
    video_id: str = ""  # YouTube video ID of the lecture; empty while it's being made
    challenges: list = field(default_factory=list)
    # filled in by the registry
    number: int = 0
    help_video_id: str = ""  # where "Stuck?" sends people: this lecture, or Chapter 0's until it has one

    @property
    def points(self):
        return sum(c.points for c in self.challenges)

    @property
    def video_url(self):
        return f"https://www.youtube.com/watch?v={self.video_id}" if self.video_id else ""

    @property
    def help_video_url(self):
        return f"https://www.youtube.com/watch?v={self.help_video_id}"
