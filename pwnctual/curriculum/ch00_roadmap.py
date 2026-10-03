from .model import Chapter

WRITEUP = r"""
That's the road ahead. Here's how every chapter after this one works.

### Every chapter

1. **Watch the lecture.** It plays right on the chapter page.
2. **Read the writeup.** It unlocks when the video ends: the same ideas written
   down, so you can look things up while you play.
3. **Play the challenges.** They live on [OverTheWire](https://overthewire.org),
   real servers you log in to from your own terminal.
4. **Say when you're done.** There's no checker. Press **I finished it** and we
   take your word for it. Cheating here would only cheat you.

### When you get stuck

You will, and that's good: getting stuck is how you learn in this field. Don't
go looking for walkthroughs. Press **Stuck?** on any challenge and comment on
the YouTube video with exactly where you're stuck. We'll reply with a nudge that
keeps the challenge yours to solve.

### It's free

The whole course is free forever. Watching the
lectures here or on YouTube is what keeps it that way.

Ready? Chapter 1 is next.
"""

CHAPTER = Chapter(
    "roadmap", "Start Here: The Roadmap",
    "What this course is, how it works, and where it's taking you.",
    writeup=WRITEUP,
    video_id="33cANYTCsjg",
)
