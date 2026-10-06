"""Data model for the pwnctual course.

Hierarchy:  Module  ->  Chapter  ->  Challenge

A module groups chapters on one topic. Chapter 0, the roadmap, sits on its own before them.

A chapter can have a YouTube lecture, a writeup, and challenges hosted on outside
practice sites (OverTheWire, Exercism). Any of these can be missing: Chapter 0 is just a
video, and some chapters are just a writeup. Nothing is auto-checked:
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
    platform: str = "OverTheWire"  # the site that hosts it, shown on its card
    # filled in by the registry
    chapter: Optional["Chapter"] = None


@dataclass
class Chapter:
    id: str
    title: str
    summary: str
    notes: str = ""     # markdown, shown under the lecture; empty for none
    video_id: str = ""  # YouTube video ID of the lecture; empty while it's being made
    challenges: list = field(default_factory=list)
    # filled in by the registry
    number: int = 0
    module: Optional["Module"] = None
    help_video_id: str = ""  # where "Stuck?" sends people: this lecture, or Chapter 0's until it has one

    @property
    def slug(self):
        """The chapter's URL path segment: chapter-0, chapter-1, ..."""
        return f"chapter-{self.number}"

    @property
    def url(self):
        return f"/learn/{self.slug}"

    @property
    def video_url(self):
        return f"https://www.youtube.com/watch?v={self.video_id}" if self.video_id else ""

    @property
    def help_video_url(self):
        return f"https://www.youtube.com/watch?v={self.help_video_id}"


@dataclass
class Module:
    id: str
    title: str
    summary: str
    chapters: list = field(default_factory=list)
    # filled in by the registry
    number: int = 0

    @property
    def tone(self):
        """The module's colour, used by every card that stands for it."""
        return ("primary", "tertiary", "secondary")[self.number % 3]

    @property
    def challenges(self):
        return [c for ch in self.chapters for c in ch.challenges]
