# 💀 pwnctual

Learn to hack, from absolute zero to vulnerability research: a six-year path where every year
ends with a profile you can get hired on. Inspired by pwn.college, styled with
Google's Material 3 Expressive, and ranked like a competitive game: climb from **Noob** to **Ghost**.

```
pwnctual/            Flask site (pages, auth, lessons, ranks)
  curriculum/        Chapters (video + write-up) → live challenges
  ranks.py           Ranked ladder + thresholds
  emblems.py         SVG skull emblems for every rank
```

## Run it locally

```bash
pip install -r requirements.txt
PWNCTUAL_DEV=1 python -m pwnctual          # http://127.0.0.1:5000
```

`PWNCTUAL_DEV=1` enables a username-only sign-in so you can try everything without GitHub.

## Deploy

1. **Sign-in providers.** Configure one or both:
   - **Google:** in Google Cloud Console, open *Google Auth Platform → Clients → Create client → Web application*.
     Add the redirect URI `https://YOUR-SITE/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
     Requests only `openid email profile`, uses PKCE, and checks state, nonce, issuer, audience and expiry.
   - **GitHub:** create an OAuth app at github.com/settings/developers with callback `https://YOUR-SITE/auth/callback`.
   Accounts are matched only by each provider's own user ID, so a Google account and a GitHub account are
   separate pwnctual accounts even if the names match.
2. Copy `.env.example` to `.env` and fill it in (the app loads it automatically).
3. Run behind a real WSGI server, e.g. `gunicorn -w 4 "pwnctual.app:app"`.

## Free course and Pro

The whole course is free for everyone, forever: every chapter, video, write-up and challenge.
**pwnctual Pro** ($10 a month, set with `PWNCTUAL_PRO_PRICE`) adds 1-on-1 calls with a mentor for
questions and doubts. Only Pro members (and admins) can book a call; the site enforces this.

- **Selling Pro:** set `PWNCTUAL_CHECKOUT_URL` to a payment link to enable the Pro button. Without it, the button
  reads "Checkout opens soon".
- **Granting Pro by hand:** `python -m pwnctual grant-pro LOGIN` (30 days by default, adds to any time left;
  `--days N` to change it) and `python -m pwnctual revoke-pro LOGIN`.
- **1-on-1 calls:** Pro members book 15-minute calls at `/classes`. Slots run from 08:00 to 24:00 in
  `PWNCTUAL_CLASS_TZ` (default `Asia/Riyadh`), and each learner sees them in their own timezone. A slot can only
  be booked once, and each person can hold one upcoming booking. Set `PWNCTUAL_CLASS_MEET_URL` to your
  video-call link, and list your login in `PWNCTUAL_ADMINS` to see every booking at `/classes/admin`.

## How lessons work

The course is just a list of chapters, with no days or weeks. Each chapter is three steps on one page:

1. **Watch** the recording (`video`). YouTube links are embedded; anything else gets a "Watch" button.
   Leave it empty until the video is published and the page shows "coming soon".
2. **Read** the written explanation (`lecture`, Markdown).
3. **Do the live challenges.** Each `Challenge` links out to where it is hosted (e.g. OverTheWire). Learners
   solve it there, then press **I finished it** to record the solve and earn points (self-reported).
   A **Stuck?** button tells them not to look up a walkthrough: read the `man` page first, then ask in the
   comments of that chapter's video, where you'll reply.

## Ranks

| Rank | Emblem |
|------|--------|
| Noob | iron medallion |
| Shadow | indigo spiked shield, wings, glowing eyes |
| Demon | crimson crest, horns, burning eyes |
| Reaper | emerald crest, crossed scythes, wings |
| **Ghost** | prismatic crest, crown, spectral wings, rotating halo |

Thresholds scale with the total number of points in the curriculum (`ranks.thresholds`), on a curve that
makes early ranks quick and later ones hard. **Ghost requires clearing every challenge**, so each new
chapter raises the bar.

## Adding content

Create `pwnctual/curriculum/chNN_<name>.py` exporting `CHAPTER` (see `ch01_terminal.py`), then import it
and add it to `CHAPTERS` in `curriculum/__init__.py`. Chapters are numbered in list order.

```python
CHAPTER = Chapter(
    "data-flow", "Data Flow", "Pipes, redirection and filtering text.",
    video="https://www.youtube.com/watch?v=VIDEO_ID",
    lecture=LECTURE,   # Markdown
    challenges=[
        Challenge("bandit-4", "Bandit Level 3 → 4", 15,
                  "https://overthewire.org/wargames/bandit/bandit4.html",
                  "What the learner has to do, with hints but no answers."),
    ],
)
```

Challenge slugs must stay stable once people have solved them, because solves are stored by slug.
