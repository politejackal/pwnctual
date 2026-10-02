from .model import Chapter


LECTURE = r"""
### What pwnctual is

A path from **absolute zero** to **vulnerability researcher**: the person who
finds security bugs nobody else has found yet, in browsers, operating systems,
phones and the software everyone uses, and reports them before attackers do.

You don't need to know how to program, use Linux or know what a network port
is. We build every piece of it, one chapter at a time.

### The promise

**Leave whenever you want. Leave with something real on your CV.**

The full path takes six years, and life happens. You might get a job halfway
through, change your mind, or just need a break. That's fine. Every year is
built to end with something concrete you can show: a skill you can prove, a
vulnerability with your name on it, a job. No stage only pays
off "in year six".

### The six years

| year | what you learn                 | what we cover                                                  | you leave with                                                          |
|------|--------------------------------|----------------------------------------------------------------|-------------------------------------------------------------------------|
| 1    | How computers actually work    | Programming from zero → memory and the processor → assembly    | You can read assembly and know what a program does at the machine level |
| 2    | Breaking web apps and networks | Web vulnerabilities → breaking into machines → attacking whole networks | You get hired for your first security job                      |
| 3    | Breaking programs              | Memory corruption → reverse engineering → writing exploits     | You can take apart a program you've never seen and exploit it           |
| 4    | Finding bugs nobody has found  | Fuzzing → searching code for bugs → reading real open-source code | Your first CVE                                                       |
| 5    | Pick one thing and go deep     | Browsers, OS kernels, phones or AI systems. Pick one.          | A full working exploit chain on a hard target                           |
| 6    | Real research                  | Your own bugs, your own tools, talks at conferences            | Hired as a vulnerability researcher                                     |

A few terms you'll hear a lot:

- **Assembly** is the low-level language the processor actually runs.
- **Fuzzing** means throwing huge numbers of weird, mutated inputs at a program
  automatically until it crashes, then working out why.
- A **CVE** is a public ID given to a security vulnerability. Getting one means
  you found a real bug in real software, on public record with your name on it.
- An **exploit chain** links several bugs together to go from "this program
  does something odd" all the way to "I control this machine".

### How every chapter works

1. **Watch.** A recorded lesson where the idea is explained and demoed live.
2. **Read.** A written version, like this page, to search, revisit and copy
   commands from.
3. **Hack.** Live challenges on real servers, like OverTheWire. Solve them
   there, come back, mark them done, earn points and climb from **Noob** to
   **Ghost**.

Everything you need for a chapter's challenges is taught in that chapter,
before you get to them.

This chapter has no challenges. Your first ones are in Chapter 1.

### Four habits

- **No walkthroughs.** You will get stuck. That's the actual job. Read the
  documentation, re-read the lesson and dig.
- **Ask in the comments.** Still stuck? Ask under that chapter's video. Say
  where you are and what you've tried. I'm active there and I'll reply.
- **Keep notes,** in your own words. Writing it yourself is what makes it stick.
- **Go at your own pace.** There are no deadlines. Finish a chapter, then move
  on.
"""


CHAPTER = Chapter(
    "start-here", "Start Here",
    "What this course is, the six-year roadmap, and how every chapter works.",
    video="https://youtu.be/33cANYTCsjg",
    lecture=LECTURE,
)
