"""Curriculum registry. To add a chapter, create a module exporting CHAPTER and list it here."""
from . import ch00_start_here, ch01_terminal

# Numbered from 0: chapter 0 is the course intro.
CHAPTERS = [ch00_start_here.CHAPTER, ch01_terminal.CHAPTER]

CHALLENGES = {}
CHAPTERS_BY_ID = {}

for ni, chapter in enumerate(CHAPTERS):
    chapter.number = ni
    if chapter.id in CHAPTERS_BY_ID:
        raise ValueError(f"duplicate chapter id: {chapter.id}")
    CHAPTERS_BY_ID[chapter.id] = chapter
    for ci, chal in enumerate(chapter.challenges, start=1):
        chal.chapter = chapter
        chal.number = f"{ni}.{ci}"
        if chal.slug in CHALLENGES:
            raise ValueError(f"duplicate challenge slug: {chal.slug}")
        CHALLENGES[chal.slug] = chal

FREE_SLUGS = {c.slug for ch in CHAPTERS if ch.free for c in ch.challenges}
TOTAL_POINTS = sum(c.points for c in CHALLENGES.values())
