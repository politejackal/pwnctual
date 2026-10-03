"""Course registry. To add a chapter, create a module exporting CHAPTER and list it here."""
from . import ch00_roadmap, ch01_terminal_ssh

# Numbered from 0: Chapter 0 is the course roadmap video.
CHAPTERS = [ch00_roadmap.CHAPTER, ch01_terminal_ssh.CHAPTER]

CHALLENGES = {}
CHAPTER_BY_ID = {}

for ci, chapter in enumerate(CHAPTERS):
    chapter.number = ci
    if chapter.id in CHAPTER_BY_ID:
        raise ValueError(f"duplicate chapter id: {chapter.id}")
    CHAPTER_BY_ID[chapter.id] = chapter
    chapter.help_video_id = chapter.video_id or CHAPTERS[0].video_id
    for i, chal in enumerate(chapter.challenges, start=1):
        chal.chapter = chapter
        chal.number = f"{ci}.{i}"
        if chal.slug in CHALLENGES:
            raise ValueError(f"duplicate challenge slug: {chal.slug}")
        CHALLENGES[chal.slug] = chal

if not CHAPTERS[0].video_id:
    raise ValueError("Chapter 0 needs a video: it's where Stuck? sends people for chapters without one")

TOTAL_POINTS = sum(c.points for c in CHALLENGES.values())
