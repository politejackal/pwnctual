"""Course registry. To add a chapter, create a module exporting CHAPTER and list it here."""
from . import ch01_first_contact

CHAPTERS = [ch01_first_contact.CHAPTER]

CHALLENGES = {}
CHAPTER_BY_ID = {}

for ci, chapter in enumerate(CHAPTERS, start=1):
    chapter.number = ci
    if chapter.id in CHAPTER_BY_ID:
        raise ValueError(f"duplicate chapter id: {chapter.id}")
    CHAPTER_BY_ID[chapter.id] = chapter
    for i, chal in enumerate(chapter.challenges, start=1):
        chal.chapter = chapter
        chal.number = f"{ci}.{i}"
        if chal.slug in CHALLENGES:
            raise ValueError(f"duplicate challenge slug: {chal.slug}")
        CHALLENGES[chal.slug] = chal

TOTAL_POINTS = sum(c.points for c in CHALLENGES.values())
