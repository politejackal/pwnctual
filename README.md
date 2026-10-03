# 💀 pwnctual

Learn to hack from absolute zero. **Free forever.** Every chapter is a YouTube lecture, a writeup
that unlocks when the video ends, and real challenges on [OverTheWire](https://overthewire.org).
Styled with Google's Material 3 Expressive, and ranked like a competitive game: climb from **Noob** to **Ghost**.

```
pwnctual/            Flask site (pages, auth, progress API, live classes)
  curriculum/        Chapters → Challenges (pure Python)
  ranks.py           Ranked ladder + thresholds
  emblems.py         SVG skull emblems for every rank
```

## Run it locally

```bash
pip install -r requirements.txt
PWNCTUAL_DEV=1 python -m pwnctual          # http://127.0.0.1:5000
```

`PWNCTUAL_DEV=1` enables a username-only sign-in so you can try everything without GitHub or Google.

## Deploy

1. **Sign-in providers.** Configure one or both:
   - **Google:** in Google Cloud Console, open *Google Auth Platform → Clients → Create client → Web application*.
     Add the redirect URI `https://YOUR-SITE/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
     Requests only `openid email profile`, uses PKCE, and checks state, nonce, issuer, audience and expiry.
   - **GitHub:** create an OAuth app at github.com/settings/developers with callback `https://YOUR-SITE/auth/callback`.
   Accounts are matched only by each provider's own user ID, so a Google account and a GitHub account are
   separate pwnctual accounts even if the names match.
2. Copy `.env.example` to `.env` and fill it in (the app loads it automatically). Set `PWNCTUAL_PUBLIC_URL` to the site's public address.
3. Run behind a real WSGI server, e.g. `gunicorn -w 4 "pwnctual.app:app"`.

### Free hosting: PythonAnywhere

The free plan keeps files between restarts, so the SQLite database just works. The site lives at
`https://YOURNAME.pythonanywhere.com`.

1. Sign up for a free *Beginner* account at pythonanywhere.com.
2. **Account** page → *API token* → *Create a new API token*. This lets the setup script do the Web tab's
   work for you.
3. Open a **new Bash console** (Consoles tab) and run:
   ```bash
   git clone https://github.com/politejackal/pwnctual.git ~/pwnctual && bash ~/pwnctual/deploy/pythonanywhere.sh
   ```
   This creates a virtualenv, installs the requirements, creates `~/pwnctual/.env` with your public URL
   and a random secret, creates the web app, sets its virtualenv, maps `/static/`, forces HTTPS, points
   the WSGI file at `wsgi.py` and reloads. The site is now live.
4. Turn on sign-in: add your keys to `~/pwnctual/.env` (step 1 above, with callbacks on
   `https://YOURNAME.pythonanywhere.com`) and press *Reload* on the Web tab.

Without an API token the script still sets up the code; create the web app by hand (*Web* tab → *Add a
new web app* → *Manual configuration*), set the virtualenv to `/home/YOURNAME/.virtualenvs/pwnctual`, map
`/static/` to `/home/YOURNAME/pwnctual/pwnctual/static`, and run the script again.

To update the site later, run `bash ~/pwnctual/deploy/pythonanywhere.sh` again.
Your `.env`, `.secret` and `pwnctual.db` are left alone.

Free-plan limits: press *Run until 1 month from today* on the Web tab at least once a month or the
site is switched off. Outbound requests only reach allowlisted sites (pythonanywhere.com/whitelist): GitHub
sign-in works, so check that Google's OAuth hosts are on that list before enabling Google sign-in.
Back up `pwnctual.db` now and then from the Files tab.

### Render (paid, always on)

`render.yaml` is a Render Blueprint for the full site. In the Render dashboard choose *New → Blueprint*,
pick this repo, and fill in the sign-in keys it asks for. It runs gunicorn, keeps the SQLite database on a
1 GB disk at `/var/data` (disks need the Starter plan), and generates `PWNCTUAL_SECRET`. The public URL
defaults to the `https://<name>.onrender.com` address Render assigns; set `PWNCTUAL_PUBLIC_URL` if you add
a custom domain. Use that URL in the OAuth callbacks from step 1.

## How the course works

Each chapter page has three parts:

1. **Lecture.** The YouTube video, embedded with the official player so every watch counts as a view on the
   channel. A "Watch on YouTube" link sits under it.
2. **Writeup.** Unlocks when the video ends (detected with the YouTube IFrame API). Signed-in learners have
   this remembered on the server, everyone else in their browser. An "Already watched it?" link unlocks it
   by hand for returning learners.
3. **Challenges.** Links to OverTheWire levels. There is no checker: when a learner presses
   **I finished it**, we take their word for it and award the points. They can undo it too.

**Stuck?** buttons open a dialog that sends learners to the lecture's YouTube comments with a ready-made
comment template (which challenge, what they tried, what happened). It tells them that getting stuck is
part of learning and asks them not to look up walkthroughs, so replies can nudge without spoiling.

## Live classes

Learners book free 15-minute calls at `/classes`. Slots run from 08:00 to 24:00 in `PWNCTUAL_CLASS_TZ`
(default `Asia/Riyadh`), and each learner sees them in their own timezone. A slot can only be booked once,
and each person can hold one upcoming booking. Set `PWNCTUAL_CLASS_MEET_URL` to your video-call link, and
list your login in `PWNCTUAL_ADMINS` to see every booking at `/classes/admin`.

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

## Adding a chapter

Chapters are numbered from 0. Chapter 0 is the course roadmap: just a video and a short "how this works"
writeup, no challenges. A chapter with `video_id=""` shows "lecture coming soon" and opens its writeup and
challenges straight away; its **Stuck?** button points to Chapter 0's video until it gets its own. Chapter 1's
lecture isn't out yet: paste its video ID into `curriculum/ch01_first_contact.py` when it is.

Create `pwnctual/curriculum/chNN_<name>.py` exporting `CHAPTER`, then add it to `CHAPTERS` in
`curriculum/__init__.py`:

```python
from .model import Chapter, Challenge

CHAPTER = Chapter(
    "chapter-id", "Chapter Title", "One-line summary.",
    writeup=r"""Markdown shown after the lecture ends.""",
    video_id="YOUTUBE_VIDEO_ID",   # the part after youtu.be/ or watch?v=
    challenges=[
        Challenge("bandit-4", "Bandit Level 3 → 4",
                  "https://overthewire.org/wargames/bandit/bandit4.html",
                  "One line on what the level is about, never the answer."),
    ],
)
```

Challenge slugs must be unique across all chapters; each is worth 10 points unless you set `points=`.
