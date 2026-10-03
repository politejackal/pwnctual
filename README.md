# 💀 pwnctual

Learn to hack, from absolute zero to vulnerability research: a six-year path where every year
ends with a profile you can get hired on. Inspired by pwn.college, styled with
Google's Material 3 Expressive, and ranked like a competitive game: climb from **Noob** to **Ghost**.

```
pwnctual/            Flask site (pages, auth, CLI API, checker)
  curriculum/        Paths → Modules → Challenges (pure Python)
  ranks.py           Ranked ladder + thresholds
  emblems.py         SVG skull emblems for every rank
workspace/           GitHub Codespaces template: devcontainer + `pwnctual` CLI
```

## Run it locally

```bash
pip install -r requirements.txt
PWNCTUAL_DEV=1 python -m pwnctual          # http://127.0.0.1:5000
```

`PWNCTUAL_DEV=1` enables a username-only sign-in so you can try everything without GitHub.
Then, in another terminal:

```bash
export PWNCTUAL_URL=http://127.0.0.1:5000
python workspace/bin/pwnctual login        # approve the code at /link
python workspace/bin/pwnctual new hello-hacker
python workspace/bin/pwnctual check hello-hacker
```

## Deploy

1. **Sign-in providers.** Configure one or both:
   - **Google:** in Google Cloud Console, open *Google Auth Platform → Clients → Create client → Web application*.
     Add the redirect URI `https://YOUR-SITE/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
     Requests only `openid email profile`, uses PKCE, and checks state, nonce, issuer, audience and expiry.
   - **GitHub:** create an OAuth app at github.com/settings/developers with callback `https://YOUR-SITE/auth/callback`.
   Accounts are matched only by each provider's own user ID, so a Google account and a GitHub account are
   separate pwnctual accounts even if the names match.
2. Copy `.env.example` to `.env` and fill it in (the app loads it automatically). Codespaces must be able to reach the site, so it needs a public URL.
3. Run behind a real WSGI server, e.g. `gunicorn -w 4 "pwnctual.app:app"`.
4. **Workspace template:** push `workspace/` to its own GitHub repo, mark it as a *template repository*,
   set `PWNCTUAL_URL` in `.devcontainer/devcontainer.json` to your site, and point
   `PWNCTUAL_WORKSPACE_REPO` at it. The "Launch Codespace" button opens `codespaces.new/<repo>`.

### Render

`render.yaml` is a Render Blueprint for the full site. In the Render dashboard choose *New → Blueprint*,
pick this repo, and fill in the sign-in keys it asks for. It runs gunicorn, keeps the SQLite database on a
1 GB disk at `/var/data` (disks need the Starter plan), and generates `PWNCTUAL_SECRET`. The public URL
defaults to the `https://<name>.onrender.com` address Render assigns; set `PWNCTUAL_PUBLIC_URL` if you add
a custom domain. Use that URL in the OAuth callbacks from step 1.

### Static preview on GitHub Pages

`.github/workflows/pages.yml` publishes a static copy of the public pages (home, course, paths and modules,
ranks, pricing) on every push to `main`. It runs `python scripts/freeze.py`, which renders the site
logged out with an empty leaderboard. Sign-in, the CLI, bookings and anything else that needs the server
only work on the Flask deployment above. One-time setup: *Settings → Pages → Source: GitHub Actions*.

## Free week and Pro

Week 1 of the 30-day course is free for everyone, including on-call live classes during that free week. Weeks 2–4
and live classes for the rest of the month are part of **pwnctual Pro**
($10 for one month, set with `PWNCTUAL_PRO_PRICE`). The site and the CLI both enforce this: a free account can't
start a Pro challenge. Which days count as free is set by `FREE_WEEKS` in `curriculum/schedule.py`.

- **Selling Pro:** set `PWNCTUAL_CHECKOUT_URL` to a payment link to enable the Pro button. Without it, the button
  reads "Checkout opens soon".
- **Granting Pro by hand:** `python -m pwnctual grant-pro LOGIN` (30 days by default, adds to any time left;
  `--days N` to change it) and `python -m pwnctual revoke-pro LOGIN`.
- **Live classes:** learners book 15-minute calls at `/classes`. Slots run from 08:00 to 24:00 in
  `PWNCTUAL_CLASS_TZ` (default `Asia/Riyadh`), and each learner sees them in their own timezone. A slot can only
  be booked once, and each person can hold one upcoming booking. Set `PWNCTUAL_CLASS_MEET_URL` to your
  video-call link, and list your login in `PWNCTUAL_ADMINS` to see every booking at `/classes/admin`.

## How checking works

pwnctual never runs learner code on the server, and there are no static flags to share.

1. `pwnctual check <slug>` asks the server for an attempt. The server generates **random test cases** and
   keeps the expected answers (keys starting with `_`) to itself.
2. The CLI runs the learner's program in their Codespace once per case (stdin, args, input files),
   with a 10-second timeout, and sends back stdout, stderr and any requested output files.
3. The server compares the results. On success it records the solve, returns a per-user HMAC flag,
   and reports promotions. On failure it shows the failing input, the expected output and the learner's output.

Attempts are single-use and expire after 15 minutes.

CLI login uses a device-code flow: `pwnctual login` prints a code, the learner approves it at `/link` while
signed in with GitHub, and the CLI receives a token. Only hashes of tokens are stored. Learners can also
create and revoke tokens on the Workspace page.

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
path raises the bar.

## Adding content

Create `pwnctual/curriculum/p2_<name>.py` exporting `PATH`, then add it to `PATHS` in
`curriculum/__init__.py`. Then put its challenge slugs on the matching days in
`curriculum/schedule.py`, the 30-day course plan shown at `/course`. Days with slugs go live
automatically, and days without them show as "coming soon". Each challenge needs a generator:

```python
def gen(rng, i):            # i = case index, handy for covering every branch
    n = rng.randint(1, 100)
    return {"stdin": f"{n}\n", "_expect": str(n * 2)}

Challenge("double-it", "Double It", 15, "Read n, print 2n.", gen, cases=3)
```

A case can include `stdin`, `args`, `files` (`{name: text}` or `{name: {"b64": ...}}`) and `collect`
(output files to send back). Set `check="contains"` for substring matching, or `check="files"` together
with `_expect_files` to grade the files a program writes.
