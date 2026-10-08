"""Course registry. To add a chapter, create a file exporting CHAPTER and list it in a module here."""
from .model import Module
from . import ch00_welcome, ch01_welcome_to_the_terminal

# Chapter 0, the welcome video, comes before every module.
INTRO = ch00_welcome.CHAPTER

MODULES = [
    Module("linux-basics", "Linux Basics",
           "The terminal, SSH, and finding your way around a Linux box.",
           [ch01_welcome_to_the_terminal.CHAPTER]),
]

# Numbered from 0 straight through the modules, so chapter numbers never reset.
CHAPTERS = ([INTRO] if INTRO else []) + [ch for m in MODULES for ch in m.chapters]
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
CHAPTER_BY_SLUG = {}

for ci, chapter in enumerate(CHAPTERS):
    chapter.number = ci
    if chapter.id in CHAPTER_BY_ID:
        raise ValueError(f"duplicate chapter id: {chapter.id}")
    CHAPTER_BY_ID[chapter.id] = chapter
    CHAPTER_BY_SLUG[chapter.slug] = chapter
    chapter.help_video_id = chapter.video_id or CHAPTERS[0].video_id or ""
    for chal in chapter.challenges:
        chal.chapter = chapter
        if chal.slug in CHALLENGES:
            raise ValueError(f"duplicate challenge slug: {chal.slug}")
        CHALLENGES[chal.slug] = chal

if CHAPTERS and not CHAPTERS[0].video_id:
    raise ValueError("Chapter 0 needs a video: it's where Stuck? sends people for chapters without one")

# Modules and chapters share /learn/<id>, so module ids can't overlap chapter ids or slugs.
for clash in MODULE_BY_ID.keys() & (CHAPTER_BY_ID.keys() | CHAPTER_BY_SLUG.keys()):
    raise ValueError(f"module and chapter share an id: {clash}")

TOTAL_CHALLENGES = len(CHALLENGES)
