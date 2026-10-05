"""Course registry. To add a chapter, create a file exporting CHAPTER and list it in a module here."""
from .model import Module
from . import (ch00_roadmap, ch01_terminal_ssh, ch02_looking_around, ch03_flags_and_paths,
               ch04_spaces)

# Chapter 0, the course roadmap video, comes before every module.
INTRO = ch00_roadmap.CHAPTER

MODULES = [
    Module("linux-the-very-basics", "Linux: The Very Basics",
           "The terminal, SSH, and finding your way around a Linux box.",
           [ch01_terminal_ssh.CHAPTER, ch02_looking_around.CHAPTER,
            ch03_flags_and_paths.CHAPTER, ch04_spaces.CHAPTER]),
]

# Numbered from 0 straight through the modules, so chapter and challenge numbers never reset.
CHAPTERS = [INTRO] + [ch for m in MODULES for ch in m.chapters]
MODULE_BY_ID = {}

for mi, m in enumerate(MODULES, start=1):
    m.number = mi
    if m.id in MODULE_BY_ID:
        raise ValueError(f"duplicate module id: {m.id}")
    MODULE_BY_ID[m.id] = m
    for ch in m.chapters:
        ch.module = m

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

# Modules and chapters share /learn/<id>, so their ids can't overlap.
for clash in MODULE_BY_ID.keys() & CHAPTER_BY_ID.keys():
    raise ValueError(f"module and chapter share an id: {clash}")

TOTAL_CHALLENGES = len(CHALLENGES)
