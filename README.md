# 💀 pwnctual

Learn to hack from absolute zero. **Free forever.** Every chapter is a YouTube lecture, a writeup,
and a real hands-on challenge on a practice server such as [OverTheWire](https://overthewire.org).
Styled with Google's Material 3 Expressive, and ranked like a competitive game: climb from **Noob** to **Ghost**.

```
pwnctual/            Flask site (pages, auth, progress API, live classes)
  curriculum/        Modules → Chapters → Challenges (pure Python)
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

1. **Sign-in (GitHub).** Create an OAuth app at github.com/settings/developers with callback
   `https://YOUR-SITE/auth/callback`, then set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
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
site is switched off. Outbound requests only reach allowlisted sites (pythonanywhere.com/whitelist); GitHub
sign-in works.
Back up `pwnctual.db` now and then from the Files tab.

### Your own domain, free: Cloudflare in front of PythonAnywhere

The free PythonAnywhere plan only serves `YOURNAME.pythonanywhere.com`. A free Cloudflare Worker
(`cloudflare/worker.js`) sits on `pwnctual.com` and forwards every request there, so visitors only ever see
`pwnctual.com`. `www.` and `http://` redirect to `https://pwnctual.com`, and the app redirects anyone who
opens the `pythonanywhere.com` address directly.

1. **Cloudflare:** sign up (free), *Add a domain* → `pwnctual.com` → Free plan. Cloudflare shows two
   nameservers.
2. **Registrar (Spaceship):** domain → *Nameservers* → custom → paste Cloudflare's two. Wait until Cloudflare
   says the domain is *Active* (minutes to a few hours).
3. **Let GitHub deploy the Worker:** in Cloudflare, *My Profile → API Tokens → Create Token → "Edit
   Cloudflare Workers"* template (all accounts, zone `pwnctual.com`). In GitHub, *Settings → Secrets and
   variables → Actions*, add `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID` (shown on the
   Cloudflare dashboard's right side). Then *Actions → Cloudflare Worker → Run workflow*. Pushes to `main`
   that change the Worker redeploy it.
4. **PythonAnywhere:** in a Bash console run
   `PWNCTUAL_PUBLIC_URL=https://pwnctual.com bash ~/pwnctual/deploy/pythonanywhere.sh`.
5. **Sign-in:** set the GitHub OAuth app's callback to `https://pwnctual.com/auth/callback`.

The Worker free plan allows 100,000 requests a day.

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
2. **Writeup.** The same ideas in Markdown, always visible under the lecture.
3. **Challenge.** Usually one per chapter, linking to a level on a practice site such as OverTheWire. There is no checker: when a learner presses
   **I finished it**, we take their word for it and it counts toward their rank. They can undo it too.

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

Ranks are earned by challenges completed: **Shadow** at 100, **Demon** at 500, **Reaper** at 2,500 and
**Ghost** at 10,000 (`ranks.THRESHOLDS`).

## Adding a chapter

Chapters are numbered from 0. Chapter 0 is the course roadmap: just a video, no writeup and no
challenges. A chapter with `video_id=""` shows "lecture coming soon" above its writeup and challenge; its **Stuck?** button points to Chapter 0's video until it gets its own.

Every other chapter belongs to a module, a group of chapters on one topic (Chapters 1–4 make up
**Linux: The Very Basics**). The Learn and Home pages show Chapter 0 and one card per module; a
module's chapters are listed on its own page at `/learn/<module-id>`, and each chapter lives at
`/learn/chapter-<number>` (old `/learn/<chapter-id>` links redirect there). Module ids share that URL
space, so they must not match a chapter id or `chapter-<number>`. Numbering runs straight through the modules and never resets.

Create `pwnctual/curriculum/chNN_<name>.py` exporting `CHAPTER`, then add it to a module's chapter
list in `MODULES` in `curriculum/__init__.py` (or add a new `Module(id, title, summary, [chapters])`):

```python
from .model import Chapter, Challenge

CHAPTER = Chapter(
    "chapter-id", "Chapter Title", "One-line summary.",
    notes=r"""Markdown shown under the lecture.""",
    video_id="YOUTUBE_VIDEO_ID",   # the part after youtu.be/ or watch?v=
    challenges=[
        Challenge("bandit-4", "Bandit Level 3 → 4",
                  "https://overthewire.org/wargames/bandit/bandit4.html",
                  "One line on what the level is about, never the answer."),
    ],
)
```

Challenge slugs must be unique across all chapters.
