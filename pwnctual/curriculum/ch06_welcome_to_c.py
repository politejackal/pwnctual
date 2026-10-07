from .model import Chapter

NOTES = r"""
Welcome to C! Let's start this writeup with some questions.

Why use C? Why not Python? C is a low-level language, unlike high-level
languages like Python, in which a lot of things just happen in the background,
out of your sight. But you are not learning programming to build programs; you
are learning to break them. So you don't just need to know where the program is
going correctly, you must also know when, where, and how it might go wrong. So
having a deep understanding of C is necessary, because even Python is written
in C ;) So whether or not you like C, you will have to love it.

Just kidding, it's not about whether or not you like it, because honestly it's
just a language, and a powerful one, and it's very easy. Once you understand the
basic concepts, you can use them to create complex programs. That's the whole
idea, and you as a hacker need to know where that complex stuff might make a
mistake. Quite fun, isn't it?

Now, how long does it take to master C? Well, we will focus deeply on learning
the fundamentals rather than skimming through them. Fundamentals are
fundamental :) So to answer the question, it can take months, but we will not
be learning C for months. We will understand the logic of C, then move on to
other topics and build programs using C along the way. So we will be using C in
the journey. That's the best way to learn a programming language, for me at
least ;)

So, let's dive in!!
"""

CHAPTER = Chapter(
    "welcome-to-c", "Welcome to C",
    "Why a hacker learns C instead of Python, and how we'll learn it.",
    notes=NOTES,
    video_id="au8j4nlHgsI",
)
