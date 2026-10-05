import hmac
import json
import os
import secrets
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request

import markdown
from flask import (Flask, abort, g, jsonify, redirect, render_template, request,
                   session, url_for)
from markupsafe import Markup

from . import db as dbm
from .curriculum import CHALLENGES, CHAPTER_BY_ID, CHAPTERS, TOTAL_CHALLENGES
from .emblems import emblem
from . import classes as cls
from . import shapes
from .ranks import TIERS, ladder, rank_for

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_dotenv(path):
    """Minimal .env support: KEY=VALUE lines; real environment variables win."""
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass


_load_dotenv(os.path.join(ROOT, ".env"))

app = Flask(__name__)


def _secret_key():
    key = os.environ.get("PWNCTUAL_SECRET")
    if key:
        return key
    path = os.path.join(ROOT, ".secret")
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(secrets.token_hex(32))
    with open(path) as f:
        return f.read().strip()


app.config.update(
    SECRET_KEY=_secret_key(),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("PWNCTUAL_SECURE_COOKIES") == "1",
)
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
DEV_LOGIN = os.environ.get("PWNCTUAL_DEV") == "1"
# Render sets RENDER_EXTERNAL_URL to the service's https://….onrender.com address.
PUBLIC_URL = (os.environ.get("PWNCTUAL_PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL", "")).rstrip("/")
# Live classes: video link shown to people who booked (e.g. a Google Meet room),
# and the logins allowed to see every booking at /classes/admin.
CLASS_MEET_URL = os.environ.get("PWNCTUAL_CLASS_MEET_URL", "")
ADMINS = {x.strip().lower() for x in os.environ.get("PWNCTUAL_ADMINS", "").split(",") if x.strip()}

app.teardown_appcontext(dbm.close_db)

PUBLIC_HOST = urllib.parse.urlsplit(PUBLIC_URL).netloc.lower()


@app.before_request
def canonical_host():
    """Send visitors on any other address (like the bare *.pythonanywhere.com one) to the public URL.

    Sign-in only works on the public URL, because that's where the providers send people back to.
    Requests forwarded by the Cloudflare Worker (cloudflare/worker.js) say which host the visitor used.
    """
    host = (request.headers.get("X-Pwnctual-Host") or request.host).lower()
    if not PUBLIC_HOST or host == PUBLIC_HOST or host.split(":")[0] in ("localhost", "127.0.0.1"):
        return None
    return redirect(PUBLIC_URL + request.full_path.rstrip("?"), 308 if request.method != "GET" else 301)

dbm.init_db()

HERO = {
    "big": shapes.animation(["cookie9", "clover4", "verysunny", "squircle", "cookie6"], 230, 180, 300, 3.2),
    "accent": shapes.animation(["clover8", "circle", "sunny", "cookie4"], 330, 330, 120, 2.6),
    "small": shapes.animation(["squircle", "cookie12", "clover4", "circle"], 72, 318, 96, 2.9),
}

# ------------------------------------------------------------------ helpers

_md_cache = {}


def md(text):
    if text not in _md_cache:
        _md_cache[text] = Markup(markdown.markdown(text.strip(), extensions=["fenced_code", "tables"]))
    return _md_cache[text]


def now():
    return time.time()


@app.template_filter("plural")
def plural(n, word, many=None):
    """{{ n|plural('challenge') }} -> 'challenge' when n is 1, else 'challenges'."""
    return word if n == 1 else (many or word + "s")


def base_url():
    return PUBLIC_URL or request.url_root.rstrip("/")


def current_user():
    if "user" not in g:
        g.user = None
        uid = session.get("uid")
        if uid:
            g.user = dbm.get_db().execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return g.user


def solved_slugs(user_id):
    rows = dbm.get_db().execute("SELECT slug, solved_at FROM solves WHERE user_id=?", (user_id,)).fetchall()
    return {r["slug"]: r["solved_at"] for r in rows if r["slug"] in CHALLENGES}


def score_of(slugs):
    """Your score is how many challenges you've completed."""
    return sum(1 for s in slugs if s in CHALLENGES)


def user_rank(user_id):
    return rank_for(score_of(solved_slugs(user_id)), TOTAL_CHALLENGES)


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)
    return session["csrf"]


def check_csrf():
    sent = request.form.get("csrf") or request.headers.get("X-CSRF-Token", "")
    if not sent or not hmac.compare_digest(sent, session.get("csrf", "")):
        abort(400, "bad csrf token")


# Accounts are matched by GitHub's stable user ID, never by display name.
# Logins (profile URLs) are made unique. (Accounts made with the old Google
# sign-in keep their google_sub but can no longer sign in.)

def _unique_login(base, exclude_id=None):
    base = "".join(c for c in (base or "") if c.isalnum() or c in "-_")[:32].strip("-_") or "hacker"
    db = dbm.get_db()
    candidate, n = base, 1
    while True:
        row = db.execute("SELECT id FROM users WHERE login=?", (candidate,)).fetchone()
        if row is None or row["id"] == exclude_id:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


def _create_user(login, name, avatar, **ids):
    db = dbm.get_db()
    cols = ["login", "name", "avatar_url", "created_at", *ids]
    cur = db.execute(f"INSERT INTO users ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                     (_unique_login(login), name, avatar, now(), *ids.values()))
    db.commit()
    return cur.lastrowid


def user_from_github(gh):
    db = dbm.get_db()
    row = db.execute("SELECT * FROM users WHERE github_id=?", (gh["id"],)).fetchone()
    if row is None:
        return _create_user(gh["login"], gh.get("name"), gh.get("avatar_url"), github_id=gh["id"])
    db.execute("UPDATE users SET login=?, name=?, avatar_url=? WHERE id=?",
               (_unique_login(gh["login"], exclude_id=row["id"]), gh.get("name"), gh.get("avatar_url"), row["id"]))
    db.commit()
    return row["id"]


def user_from_dev(login):
    row = dbm.get_db().execute(
        "SELECT * FROM users WHERE login=? AND github_id IS NULL AND google_sub IS NULL", (login,)).fetchone()
    return row["id"] if row else _create_user(login, login, None)


def is_admin(user):
    return bool(user) and user["login"].lower() in ADMINS


def asset(name):
    full = os.path.join(app.static_folder, name)
    v = int(os.path.getmtime(full)) if os.path.exists(full) else 0
    return url_for("static", filename=name, v=v)


@app.context_processor
def inject():
    user = current_user()
    ctx = {
        "me": user, "csrf_token": csrf_token, "asset": asset, "md": md, "emblem": lambda t, size=96: Markup(emblem(t, size)),
        "CHAPTERS": CHAPTERS, "TOTAL_CHALLENGES": TOTAL_CHALLENGES, "RANK_COUNT": len(TIERS), "DEV_LOGIN": DEV_LOGIN,
        "GITHUB_ENABLED": bool(GITHUB_CLIENT_ID),
        "my_rank": None, "my_solved": {}, "IS_ADMIN": is_admin(user),
    }
    if user:
        ctx["my_solved"] = solved_slugs(user["id"])
        ctx["my_rank"] = rank_for(score_of(ctx["my_solved"]), TOTAL_CHALLENGES)
    return ctx


# ------------------------------------------------------------------ pages

@app.get("/")
def index():
    return render_template("index.html", ladder=ladder(TOTAL_CHALLENGES), hero=HERO)


@app.get("/emblem/<int:index>.svg")
def emblem_svg(index):
    if not 0 <= index < len(TIERS):
        abort(404)
    resp = app.response_class(emblem(TIERS[index], 180), mimetype="image/svg+xml")
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


# ------------------------------------------------------------------ live classes

@app.get("/classes")
def classes_page():
    return render_template("classes.html", mentor_tz=cls.MENTOR_TZ_NAME, slot_minutes=cls.SLOT_MINUTES,
                           open_hour=cls.OPEN_HOUR, close_hour=cls.CLOSE_HOUR)


def _my_bookings(uid, upcoming_only=True):
    q = "SELECT id, start_ts, note FROM class_bookings WHERE user_id=? AND cancelled_at IS NULL"
    if upcoming_only:
        q += f" AND start_ts + {cls.SLOT_MINUTES * 60} > ?"
        rows = dbm.get_db().execute(q + " ORDER BY start_ts", (uid, int(now()))).fetchall()
    else:
        rows = dbm.get_db().execute(q + " ORDER BY start_ts", (uid,)).fetchall()
    return [{"id": r["id"], "t": r["start_ts"], "note": r["note"] or "", "meet_url": CLASS_MEET_URL} for r in rows]


@app.get("/api/classes/slots")
def api_class_slots():
    ts_now = int(now())
    starts = cls.slot_starts(ts_now)
    taken = {r["start_ts"] for r in dbm.get_db().execute(
        "SELECT start_ts FROM class_bookings WHERE cancelled_at IS NULL AND start_ts >= ?", (starts[0] if starts else ts_now,))}
    user = current_user()
    return jsonify(
        mentor_tz=cls.MENTOR_TZ_NAME, slot_minutes=cls.SLOT_MINUTES, max_upcoming=cls.MAX_UPCOMING,
        slots=[{"t": t, "taken": t in taken} for t in starts],
        signed_in=bool(user), mine=_my_bookings(user["id"]) if user else [],
    )


@app.post("/api/classes/book")
def api_class_book():
    user = current_user()
    if not user:
        return jsonify(error="Sign in to book a live class."), 401
    check_csrf()
    body = request.get_json(silent=True) or {}
    ts, note = body.get("t"), str(body.get("note") or "").strip()[:500]
    if not cls.is_valid_slot(ts, int(now())):
        return jsonify(error="That time isn't available. Please pick another slot."), 400
    db = dbm.get_db()
    # Check "one call at a time" and insert inside one write-locked transaction,
    # so two simultaneous requests from the same person can't both get through.
    db.commit()
    db.execute("BEGIN IMMEDIATE")
    try:
        if len(_my_bookings(user["id"])) >= cls.MAX_UPCOMING:
            db.rollback()
            return jsonify(error="You can only have one call booked at a time. Cancel your current call to pick a new time."), 409
        db.execute("INSERT INTO class_bookings (user_id, start_ts, note, created_at) VALUES (?,?,?,?)",
                   (user["id"], ts, note, now()))
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return jsonify(error="Someone just booked that slot. Please pick another one."), 409
    return jsonify(ok=True, mine=_my_bookings(user["id"]))


@app.post("/api/classes/<int:booking_id>/cancel")
def api_class_cancel(booking_id):
    user = current_user()
    if not user:
        return jsonify(error="Sign in first."), 401
    check_csrf()
    db = dbm.get_db()
    row = db.execute("SELECT user_id FROM class_bookings WHERE id=? AND cancelled_at IS NULL", (booking_id,)).fetchone()
    if not row or (row["user_id"] != user["id"] and not is_admin(user)):
        return jsonify(error="Booking not found."), 404
    db.execute("UPDATE class_bookings SET cancelled_at=? WHERE id=?", (now(), booking_id))
    db.commit()
    return jsonify(ok=True, mine=_my_bookings(user["id"]))


@app.get("/classes/admin")
def classes_admin():
    if not is_admin(current_user()):
        abort(404)
    rows = dbm.get_db().execute(
        "SELECT b.id, b.start_ts, b.note, u.login, u.email FROM class_bookings b JOIN users u ON u.id = b.user_id "
        "WHERE b.cancelled_at IS NULL AND b.start_ts + ? > ? ORDER BY b.start_ts",
        (cls.SLOT_MINUTES * 60, int(now()))).fetchall()
    bookings = [dict(r, mentor_time=cls.mentor_label(r["start_ts"])) for r in rows]
    return render_template("classes_admin.html", bookings=bookings, mentor_tz=cls.MENTOR_TZ_NAME)


@app.get("/learn")
def learn():
    return render_template("learn.html")


# Chapters that changed their URL: old id -> new id.
RENAMED_CHAPTERS = {"first-contact": "the-terminal-and-ssh", "finding-needles": "flags-and-paths"}


@app.get("/learn/<chapter_id>")
def chapter_page(chapter_id):
    if chapter_id in RENAMED_CHAPTERS:
        return redirect(url_for("chapter_page", chapter_id=RENAMED_CHAPTERS[chapter_id]), 301)
    chapter = CHAPTER_BY_ID.get(chapter_id) or abort(404)
    i = CHAPTERS.index(chapter)
    return render_template("chapter.html", chapter=chapter,
                           prev=CHAPTERS[i - 1] if i > 0 else None,
                           nxt=CHAPTERS[i + 1] if i + 1 < len(CHAPTERS) else None)


# The old 30-day course, paths, Pro plan and CLI setup are gone; send old links to the chapters.
@app.get("/course")
@app.get("/pricing")
@app.get("/setup")
@app.get("/workspace")
@app.get("/paths/<path:_rest>")
def old_pages(_rest=None):
    return redirect(url_for("learn"), 301)


@app.get("/ranks")
def ranks_page():
    return render_template("ranks.html", ladder=ladder(TOTAL_CHALLENGES))


def leaderboard_rows(limit=100):
    db = dbm.get_db()
    users = {u["id"]: u for u in db.execute("SELECT * FROM users").fetchall()}
    per = {}
    for r in db.execute("SELECT user_id, slug, solved_at FROM solves").fetchall():
        if r["slug"] in CHALLENGES:
            e = per.setdefault(r["user_id"], {"score": 0, "last": 0})
            e["score"] += 1
            e["last"] = max(e["last"], r["solved_at"])
    rows = [dict(user=users[uid], **e, rank=rank_for(e["score"], TOTAL_CHALLENGES))
            for uid, e in per.items() if uid in users]
    rows.sort(key=lambda x: (-x["score"], x["last"]))
    return rows[:limit]


@app.get("/leaderboard")
def leaderboard():
    return render_template("leaderboard.html", rows=leaderboard_rows())


@app.get("/u/<login>")
def profile(login):
    user = dbm.get_db().execute("SELECT * FROM users WHERE login=?", (login,)).fetchone() or abort(404)
    solved = solved_slugs(user["id"])
    rank = rank_for(score_of(solved), TOTAL_CHALLENGES)
    recent = sorted(solved.items(), key=lambda kv: -kv[1])[:8]
    return render_template("profile.html", user=user, solved=solved, rank=rank,
                           recent=[(CHALLENGES[s], t) for s, t in recent])


# ------------------------------------------------------------------ auth

@app.get("/login")
def login():
    return render_template("login.html", next=_safe_next(request.args.get("next")),
                           auth_error=session.pop("auth_error", None))


def auth_failed(message, nxt="/"):
    session["auth_error"] = message
    return redirect(url_for("login", next=nxt))


def _safe_next(nxt):
    return nxt if nxt and nxt.startswith("/") and not nxt.startswith("//") else "/"


@app.get("/auth/github")
def auth_github():
    if not GITHUB_CLIENT_ID:
        abort(503, "GitHub OAuth is not configured")
    state = secrets.token_urlsafe(16)
    session["oauth_state"] = state
    session["oauth_next"] = _safe_next(request.args.get("next"))
    q = urllib.parse.urlencode({
        "client_id": GITHUB_CLIENT_ID, "state": state, "allow_signup": "true",
        "redirect_uri": base_url() + url_for("auth_callback"),
    })
    return redirect("https://github.com/login/oauth/authorize?" + q)


def _http_json(url, data=None, headers=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers={"Accept": "application/json",
                                                          "User-Agent": "pwnctual", **(headers or {})})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.load(resp)


@app.get("/auth/callback")
def auth_callback():
    state = session.pop("oauth_state", None)
    if not state or request.args.get("state") != state:
        abort(400, "bad oauth state")
    nxt = _safe_next(session.pop("oauth_next", "/"))
    if request.args.get("error"):
        return auth_failed("GitHub sign-in was cancelled.", nxt)
    try:
        tok = _http_json("https://github.com/login/oauth/access_token", {
            "client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET,
            "code": request.args.get("code", ""),
            "redirect_uri": base_url() + url_for("auth_callback"),
        })
        if "access_token" not in tok:
            return auth_failed("GitHub sign-in failed. Please try again.", nxt)
        gh = _http_json("https://api.github.com/user", headers={"Authorization": f"Bearer {tok['access_token']}"})
    except (urllib.error.URLError, ValueError):
        return auth_failed("Couldn't reach GitHub. Please try again.", nxt)
    session.clear()
    session["uid"] = user_from_github(gh)
    return redirect(nxt)


@app.post("/auth/dev")
def auth_dev():
    if not DEV_LOGIN:
        abort(404)
    check_csrf()
    login_name = "".join(c for c in request.form.get("login", "") if c.isalnum() or c in "-_")[:39]
    if not login_name:
        abort(400)
    nxt = _safe_next(request.form.get("next"))
    session.clear()
    session["uid"] = user_from_dev(login_name)
    return redirect(nxt)


@app.post("/auth/logout")
def logout():
    check_csrf()
    session.clear()
    return redirect("/")


# ------------------------------------------------------------------ JSON API (browser)

@app.get("/api/me/progress")
def api_progress():
    user = current_user()
    if not user:
        return jsonify(error="not logged in"), 401
    solved = solved_slugs(user["id"])
    rank = rank_for(score_of(solved), TOTAL_CHALLENGES)
    return jsonify(solved=sorted(solved), score=rank["score"], rank=rank["tier"]["label"],
                   rank_key=rank["tier"]["key"], rank_index=rank["tier"]["index"])


def _api_user():
    user = current_user()
    if not user:
        abort(401)
    check_csrf()
    return user


@app.post("/api/challenges/<slug>/done")
def api_done(slug):
    """The learner says they finished (or un-finished) a challenge. We take their word for it."""
    user = _api_user()
    chal = CHALLENGES.get(slug) or abort(404)
    done = bool((request.get_json(silent=True) or {}).get("done", True))
    db = dbm.get_db()
    before = user_rank(user["id"])
    if done:
        db.execute("INSERT OR IGNORE INTO solves (user_id, slug, solved_at) VALUES (?,?,?)", (user["id"], slug, now()))
    else:
        db.execute("DELETE FROM solves WHERE user_id=? AND slug=?", (user["id"], slug))
    db.commit()
    after = user_rank(user["id"])
    t = after["tier"]
    chapter_done = all(c.slug in solved_slugs(user["id"]) for c in chal.chapter.challenges)
    return jsonify(ok=True, done=done, score=after["score"], chapter_done=chapter_done,
                   rank=t["label"], rank_key=t["key"], rank_index=t["index"],
                   promoted=t["index"] > before["tier"]["index"])


@app.errorhandler(401)
def unauthorized(e):
    if request.path.startswith("/api/"):
        return jsonify(error="Sign in first."), 401
    return redirect(url_for("login", next=request.full_path))


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify(error="not found"), 404
    return render_template("error.html", code=404, message="Nothing haunts this page."), 404
