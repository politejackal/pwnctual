"""Data model for the pwnctual course.

Hierarchy:  Module  ->  Chapter  ->  Challenge

A module groups chapters on one topic. Chapter 0, the roadmap, sits on its own before them.

A chapter can have a YouTube lecture, a writeup, and challenges hosted on outside
practice sites such as OverTheWire, or done on your own machine. Any of these can be missing: Chapter 0 is just a
video, and some chapters are just a writeup. Nothing is auto-checked:
when a learner says they finished a challenge, we take their word for it.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Challenge:
    slug: str
    title: str
    url: str       # the challenge page on the site that hosts it; empty for one done on your own machine
    brief: str     # one line on what the level is about, never the answer
    platform: str = "OverTheWire"  # the site that hosts it, shown on its card
    details: str = ""  # markdown shown under the brief, for a challenge with no site to explain it
    # filled in by the registry
    chapter: Optional["Chapter"] = None


@dataclass
class Chapter:
    id: str
    title: str
    summary: str
    notes: str = ""     # markdown, shown under the lecture; empty for none
    notes_optional: bool = False  # say under the Writeup heading that reading it can be skipped
    video_id: str = ""  # YouTube video ID of the lecture; empty while it's being made
    has_lecture: bool = True  # False for a chapter that is writeup-only on purpose: no "coming soon"
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
