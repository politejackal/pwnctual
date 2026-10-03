import base64
import hashlib
import hmac
import json
import os
import random
import secrets
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from functools import wraps

import markdown
from flask import (Flask, abort, g, jsonify, redirect, render_template, request,
                   session, url_for)
from markupsafe import Markup

from . import db as dbm
from .curriculum import CHALLENGES, MODULES, PATHS, TOTAL_POINTS
from .curriculum.schedule import DAYS, FREE_SLUGS, WEEKS
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
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")
DEV_LOGIN = os.environ.get("PWNCTUAL_DEV") == "1"
# Render sets RENDER_EXTERNAL_URL to the service's https://….onrender.com address.
PUBLIC_URL = (os.environ.get("PWNCTUAL_PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL", "")).rstrip("/")
ATTEMPT_TTL = 15 * 60
PRO_PRICE = os.environ.get("PWNCTUAL_PRO_PRICE", "$10")
PRO_DAYS = 30
# Paste a payment link (e.g. a Stripe Payment Link) to open checkout; until then
# the Pro button says checkout opens soon and Pro can be granted by hand.
CHECKOUT_URL = os.environ.get("PWNCTUAL_CHECKOUT_URL", "")
# Live classes: video link shown to people who booked (e.g. a Google Meet room),
# and the logins allowed to see every booking at /classes/admin.
CLASS_MEET_URL = os.environ.get("PWNCTUAL_CLASS_MEET_URL", "")
ADMINS = {x.strip().lower() for x in os.environ.get("PWNCTUAL_ADMINS", "").split(",") if x.strip()}
DEVICE_TTL = 10 * 60

app.teardown_appcontext(dbm.close_db)
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


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


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
    return sum(CHALLENGES[s].points for s in slugs if s in CHALLENGES)


def user_rank(user_id):
    return rank_for(score_of(solved_slugs(user_id)), TOTAL_POINTS)


def flag_for(user_id, slug):
    mac = hmac.new(app.config["SECRET_KEY"].encode(), f"{user_id}:{slug}".encode(), hashlib.sha256)
    return "pwn{" + mac.hexdigest()[:32] + "}"


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)
    return session["csrf"]


def check_csrf():
    sent = request.form.get("csrf") or request.headers.get("X-CSRF-Token", "")
    if not sent or not hmac.compare_digest(sent, session.get("csrf", "")):
        abort(400, "bad csrf token")


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not current_user():
            return redirect(url_for("login", next=request.full_path))
        return fn(*a, **kw)
    return wrapper


# Accounts are matched only by each provider's own stable ID (GitHub user id,
# Google "sub"), never by display name, so one provider can't sign into an
# account created through another. Logins (profile URLs) are made unique.

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


def user_from_google(claims):
    db = dbm.get_db()
    row = db.execute("SELECT * FROM users WHERE google_sub=?", (claims["sub"],)).fetchone()
    if row is None:
        handle = (claims.get("email") or "").split("@")[0] or claims.get("given_name") or "hacker"
        return _create_user(handle, claims.get("name"), claims.get("picture"),
                            google_sub=claims["sub"], email=claims.get("email"))
    db.execute("UPDATE users SET name=?, avatar_url=?, email=? WHERE id=?",
               (claims.get("name"), claims.get("picture"), claims.get("email"), row["id"]))
    db.commit()
    return row["id"]


def user_from_dev(login):
    row = dbm.get_db().execute(
        "SELECT * FROM users WHERE login=? AND github_id IS NULL AND google_sub IS NULL", (login,)).fetchone()
    return row["id"] if row else _create_user(login, login, None)


def is_pro(user):
    return bool(user) and (user["pro_until"] or 0) > now()


def is_admin(user):
    return bool(user) and user["login"].lower() in ADMINS


def can_access(user, chal):
    return chal.slug in FREE_SLUGS or is_pro(user)


def asset(name):
    full = os.path.join(app.static_folder, name)
    v = int(os.path.getmtime(full)) if os.path.exists(full) else 0
    return url_for("static", filename=name, v=v)


@app.context_processor
def inject():
    user = current_user()
    ctx = {
        "me": user, "csrf_token": csrf_token, "asset": asset, "md": md, "emblem": lambda t, size=96: Markup(emblem(t, size)),
        "PATHS": PATHS, "TOTAL_POINTS": TOTAL_POINTS, "RANK_COUNT": len(TIERS), "DEV_LOGIN": DEV_LOGIN,
        "GITHUB_ENABLED": bool(GITHUB_CLIENT_ID), "GOOGLE_ENABLED": bool(GOOGLE_CLIENT_ID),
        "my_rank": None, "my_solved": {},
        "IS_PRO": is_pro(user), "FREE_SLUGS": FREE_SLUGS, "PRO_PRICE": PRO_PRICE, "PRO_DAYS": PRO_DAYS,
        "CHECKOUT_URL": CHECKOUT_URL, "IS_ADMIN": is_admin(user),
        "pro_until": (time.strftime("%d %b %Y", time.localtime(user["pro_until"]))
                      if is_pro(user) else None),
    }
    if user:
        ctx["my_solved"] = solved_slugs(user["id"])
        ctx["my_rank"] = rank_for(score_of(ctx["my_solved"]), TOTAL_POINTS)
    return ctx


# ------------------------------------------------------------------ pages

@app.get("/")
def index():
    return render_template("index.html", ladder=ladder(TOTAL_POINTS), hero=HERO)


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


@app.get("/pricing")
def pricing():
    return render_template("pricing.html")


@app.get("/course")
def course():
    solved = solved_slugs(current_user()["id"]) if current_user() else {}
    days, up_next = {}, None
    for d in DAYS:
        done = d.live and all(s in solved for s in d.slugs)
        target = next((c for c in d.challenges if c.slug not in solved), d.challenges[0] if d.live else None)
        if d.live and not done and up_next is None:
            up_next = d.number
        days[d.number] = {
            "status": "done" if done else ("open" if d.live else "soon"),
            "solved": sum(s in solved for s in d.slugs),
            "href": f"/paths/{target.path.id}/{target.module.id}#{target.slug}" if target else None,
        }
    if up_next:
        days[up_next]["status"] = "next"
    live_days = [d for d in DAYS if d.live]
    done_days = sum(days[d.number]["status"] == "done" for d in live_days)
    return render_template("course.html", weeks=WEEKS, days=days, up_next=up_next,
                           live_days=len(live_days), done_days=done_days,
                           live_challenges=sum(len(d.slugs) for d in live_days))


@app.get("/paths/<path_id>")
def path_page(path_id):
    path = next((p for p in PATHS if p.id == path_id), None) or abort(404)
    return render_template("path.html", path=path)


@app.get("/paths/<path_id>/<module_id>")
def module_page(path_id, module_id):
    module = MODULES.get((path_id, module_id)) or abort(404)
    mods = module.path.modules
    i = mods.index(module)
    return render_template("module.html", module=module, path=module.path,
                           prev=mods[i - 1] if i > 0 else None,
                           nxt=mods[i + 1] if i + 1 < len(mods) else None)


@app.get("/ranks")
def ranks_page():
    return render_template("ranks.html", ladder=ladder(TOTAL_POINTS))


def leaderboard_rows(limit=100):
    db = dbm.get_db()
    users = {u["id"]: u for u in db.execute("SELECT * FROM users").fetchall()}
    per = {}
    for r in db.execute("SELECT user_id, slug, solved_at FROM solves").fetchall():
        if r["slug"] in CHALLENGES:
            e = per.setdefault(r["user_id"], {"score": 0, "solves": 0, "last": 0})
            e["score"] += CHALLENGES[r["slug"]].points
            e["solves"] += 1
            e["last"] = max(e["last"], r["solved_at"])
    rows = [dict(user=users[uid], **e, rank=rank_for(e["score"], TOTAL_POINTS))
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
    rank = rank_for(score_of(solved), TOTAL_POINTS)
    recent = sorted(solved.items(), key=lambda kv: -kv[1])[:8]
    return render_template("profile.html", user=user, solved=solved, rank=rank,
                           recent=[(CHALLENGES[s], t) for s, t in recent])


@app.get("/workspace")
def old_workspace():
    return redirect(url_for("setup"), 301)


@app.get("/setup")
def setup():
    tokens = []
    if current_user():
        tokens = dbm.get_db().execute(
            "SELECT rowid, label, created_at, last_used FROM tokens WHERE user_id=? ORDER BY created_at DESC",
            (current_user()["id"],)).fetchall()
    return render_template("setup.html", tokens=tokens, base=base_url(),
                           new_token=session.pop("new_token", None))


@app.get("/pwnctual.py")
def cli_download():
    """The CLI, with this site's address filled in so `python pwnctual.py login` works as is."""
    with open(os.path.join(os.path.dirname(__file__), "cli.py"), encoding="utf-8") as f:
        src = f.read().replace('DEFAULT_URL = "http://localhost:5000"', f"DEFAULT_URL = {base_url()!r}", 1)
    resp = app.response_class(src, mimetype="text/x-python")
    resp.headers["Content-Disposition"] = "attachment; filename=pwnctual.py"
    return resp


@app.post("/setup/tokens")
@login_required
def create_token():
    check_csrf()
    tok = "pwnc_" + secrets.token_urlsafe(32)
    db = dbm.get_db()
    db.execute("INSERT INTO tokens (token_hash, user_id, label, created_at) VALUES (?,?,?,?)",
               (sha(tok), current_user()["id"], "manual token", now()))
    db.commit()
    session["new_token"] = tok
    return redirect(url_for("setup") + "#tokens")


@app.post("/setup/tokens/<int:rowid>/revoke")
@login_required
def revoke_token(rowid):
    check_csrf()
    db = dbm.get_db()
    db.execute("DELETE FROM tokens WHERE rowid=? AND user_id=?", (rowid, current_user()["id"]))
    db.commit()
    return redirect(url_for("setup") + "#tokens")


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


# ------------------------------------------------------------------ Google sign-in (OpenID Connect)

def _b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _jwt_claims(token):
    payload = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))


@app.get("/auth/google")
def auth_google():
    if not GOOGLE_CLIENT_ID:
        abort(503, "Google sign-in is not configured")
    state, nonce, verifier = secrets.token_urlsafe(24), secrets.token_urlsafe(24), secrets.token_urlsafe(48)
    session["g_oauth"] = {"state": state, "nonce": nonce, "verifier": verifier,
                          "next": _safe_next(request.args.get("next"))}
    q = urllib.parse.urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": base_url() + url_for("auth_google_callback"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "code_challenge": _b64url(hashlib.sha256(verifier.encode()).digest()),
        "code_challenge_method": "S256",
        "prompt": "select_account",
    })
    return redirect(f"{GOOGLE_AUTH_URL}?{q}")


@app.get("/auth/google/callback")
def auth_google_callback():
    flow = session.pop("g_oauth", None)
    if not flow or not hmac.compare_digest(request.args.get("state", ""), flow["state"]):
        return auth_failed("Your Google sign-in expired. Please try again.")
    nxt = flow["next"]
    if request.args.get("error"):
        return auth_failed("Google sign-in was cancelled.", nxt)
    try:
        tok = _http_json(GOOGLE_TOKEN_URL, {
            "code": request.args.get("code", ""),
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": base_url() + url_for("auth_google_callback"),
            "grant_type": "authorization_code",
            "code_verifier": flow["verifier"],
        })
        # The ID token came straight from Google's token endpoint over TLS, which
        # OpenID Connect accepts in place of a signature check; validate its claims.
        claims = _jwt_claims(tok["id_token"])
    except (urllib.error.URLError, KeyError, ValueError, IndexError):
        return auth_failed("Google sign-in failed. Please try again.", nxt)
    if (claims.get("iss") not in GOOGLE_ISSUERS or claims.get("aud") != GOOGLE_CLIENT_ID
            or claims.get("exp", 0) < now() or not hmac.compare_digest(str(claims.get("nonce", "")), flow["nonce"])
            or not claims.get("sub")):
        return auth_failed("Google sign-in couldn't be verified. Please try again.", nxt)
    if claims.get("email") and not claims.get("email_verified"):
        return auth_failed("Please verify your Google email address first.", nxt)
    session.clear()
    session["uid"] = user_from_google(claims)
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


# ------------------------------------------------------------------ device linking (CLI login)

@app.route("/link", methods=["GET", "POST"])
@login_required
def link():
    code = (request.values.get("code") or "").strip().upper()
    status = None
    if request.method == "POST":
        check_csrf()
        db = dbm.get_db()
        row = db.execute("SELECT * FROM device_codes WHERE user_code=?", (code,)).fetchone()
        if not row or now() - row["created_at"] > DEVICE_TTL:
            status = "invalid"
        elif row["user_id"]:
            status = "used"
        else:
            tok = "pwnc_" + secrets.token_urlsafe(32)
            uid = current_user()["id"]
            db.execute("INSERT INTO tokens (token_hash, user_id, label, created_at) VALUES (?,?,?,?)",
                       (sha(tok), uid, "cli", now()))
            db.execute("UPDATE device_codes SET user_id=?, token=? WHERE device_code=?",
                       (uid, tok, row["device_code"]))
            db.commit()
            status = "ok"
    return render_template("link.html", code=code, status=status)


# ------------------------------------------------------------------ JSON API (browser)

@app.get("/api/me/progress")
def api_progress():
    user = current_user()
    if not user:
        return jsonify(error="not logged in"), 401
    solved = solved_slugs(user["id"])
    rank = rank_for(score_of(solved), TOTAL_POINTS)
    return jsonify(solved=sorted(solved), score=rank["score"], rank=rank["tier"]["label"],
                   rank_key=rank["tier"]["key"], rank_index=rank["tier"]["index"])


# ------------------------------------------------------------------ JSON API (CLI)

def cli_auth(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify(error="missing token, run: python pwnctual.py login"), 401
        db = dbm.get_db()
        row = db.execute("SELECT user_id FROM tokens WHERE token_hash=?", (sha(auth[7:].strip()),)).fetchone()
        if not row:
            return jsonify(error="invalid token, run: python pwnctual.py login"), 401
        db.execute("UPDATE tokens SET last_used=? WHERE token_hash=?", (now(), sha(auth[7:].strip())))
        db.commit()
        g.cli_user = db.execute("SELECT * FROM users WHERE id=?", (row["user_id"],)).fetchone()
        return fn(*a, **kw)
    return wrapper


@app.post("/api/cli/device")
def device_start():
    db = dbm.get_db()
    db.execute("DELETE FROM device_codes WHERE created_at < ?", (now() - DEVICE_TTL,))
    alphabet = "BCDFGHJKLMNPQRSTVWXZ"
    user_code = "".join(secrets.choice(alphabet) for _ in range(4)) + "-" + \
                "".join(secrets.choice(alphabet) for _ in range(4))
    device_code = secrets.token_urlsafe(32)
    db.execute("INSERT INTO device_codes (device_code, user_code, created_at) VALUES (?,?,?)",
               (device_code, user_code, now()))
    db.commit()
    return jsonify(device_code=device_code, user_code=user_code, interval=3, expires_in=DEVICE_TTL,
                   verify_url=f"{base_url()}/link", verify_url_complete=f"{base_url()}/link?code={user_code}")


@app.post("/api/cli/device/poll")
def device_poll():
    code = (request.get_json(silent=True) or {}).get("device_code", "")
    db = dbm.get_db()
    row = db.execute("SELECT * FROM device_codes WHERE device_code=?", (code,)).fetchone()
    if not row or now() - row["created_at"] > DEVICE_TTL:
        return jsonify(error="expired"), 410
    if not row["token"]:
        return jsonify(status="pending")
    db.execute("DELETE FROM device_codes WHERE device_code=?", (code,))
    db.commit()
    user = db.execute("SELECT login FROM users WHERE id=?", (row["user_id"],)).fetchone()
    return jsonify(status="ok", token=row["token"], login=user["login"])


def _rank_json(rank):
    t, n = rank["tier"], rank["next"]
    return {"label": t["label"], "key": t["key"], "index": t["index"], "score": rank["score"],
            "next": n["label"] if n else None, "to_next": rank["to_next"], "motto": t["motto"]}


@app.get("/api/cli/me")
@cli_auth
def cli_me():
    solved = solved_slugs(g.cli_user["id"])
    return jsonify(login=g.cli_user["login"], solved=len(solved), total=len(CHALLENGES),
                   rank=_rank_json(rank_for(score_of(solved), TOTAL_POINTS)))


@app.get("/api/cli/challenges")
@cli_auth
def cli_challenges():
    solved = solved_slugs(g.cli_user["id"])
    return jsonify(challenges=[{
        "slug": c.slug, "number": c.number, "title": c.title, "points": c.points,
        "module": c.module.title, "path": c.path.title, "solved": c.slug in solved,
        "pro": c.slug not in FREE_SLUGS, "locked": not can_access(g.cli_user, c),
    } for c in CHALLENGES.values()])


@app.get("/api/cli/challenges/<slug>")
@cli_auth
def cli_challenge(slug):
    c = CHALLENGES.get(slug) or abort(404)
    return jsonify(slug=c.slug, number=c.number, title=c.title, points=c.points,
                   description=c.description.strip(), starter=c.starter,
                   url=f"{base_url()}/paths/{c.path.id}/{c.module.id}#{c.slug}")


def _public(case):
    return {k: v for k, v in case.items() if not k.startswith("_")}


@app.post("/api/cli/attempts")
@cli_auth
def cli_attempt():
    slug = (request.get_json(silent=True) or {}).get("slug", "")
    c = CHALLENGES.get(slug)
    if not c:
        return jsonify(error=f"unknown challenge '{slug}'"), 404
    if not can_access(g.cli_user, c):
        return jsonify(error=f"'{c.title}' is part of pwnctual Pro ({PRO_PRICE} for {PRO_DAYS} days). "
                             f"Week 1 is free. Upgrade at {base_url()}/pricing"), 402
    rng = random.Random(secrets.randbits(64))
    cases = [c.gen(rng, i) for i in range(c.cases)]
    attempt_id = secrets.token_urlsafe(18)
    db = dbm.get_db()
    db.execute("DELETE FROM attempts WHERE created_at < ?", (now() - ATTEMPT_TTL,))
    db.execute("INSERT INTO attempts (id, user_id, slug, cases, created_at) VALUES (?,?,?,?,?)",
               (attempt_id, g.cli_user["id"], slug, json.dumps(cases), now()))
    db.commit()
    return jsonify(attempt=attempt_id, slug=slug, title=c.title, timeout=10,
                   cases=[_public(x) for x in cases])


def _norm(s):
    s = (s or "").replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(line.rstrip() for line in s.strip("\n").split("\n")).strip()


def _check(chal, case, out):
    stdout = out.get("stdout", "")
    if chal.check == "contains":
        return _norm(case["_expect"]) in stdout
    if chal.check == "files":
        files = out.get("files") or {}
        return all(_norm(files.get(k)) == _norm(v) for k, v in case["_expect_files"].items())
    return _norm(stdout) == _norm(case["_expect"])


@app.post("/api/cli/attempts/<attempt_id>")
@cli_auth
def cli_submit(attempt_id):
    db = dbm.get_db()
    row = db.execute("SELECT * FROM attempts WHERE id=? AND user_id=?", (attempt_id, g.cli_user["id"])).fetchone()
    if not row or row["status"] != "open" or now() - row["created_at"] > ATTEMPT_TTL:
        return jsonify(error="attempt expired, run the check again"), 410
    db.execute("UPDATE attempts SET status='done' WHERE id=?", (attempt_id,))
    db.commit()
    chal = CHALLENGES[row["slug"]]
    cases = json.loads(row["cases"])
    outputs = (request.get_json(silent=True) or {}).get("outputs") or []
    if len(outputs) != len(cases):
        return jsonify(error="wrong number of outputs"), 400

    for i, (case, out) in enumerate(zip(cases, outputs)):
        if not _check(chal, case, out):
            return jsonify(ok=False, failed={
                "index": i, "total": len(cases),
                "stdin": case.get("stdin", ""),
                "files": sorted((case.get("files") or {}).keys()),
                "expected": case.get("_expect") if chal.check != "files" else case.get("_expect_files"),
                "got": (out.get("stdout") or "")[:4000],
                "stderr": (out.get("stderr") or "")[-4000:],
                "exit_code": out.get("exit_code"),
            })

    uid = g.cli_user["id"]
    before = user_rank(uid)
    first = db.execute("INSERT OR IGNORE INTO solves (user_id, slug, solved_at) VALUES (?,?,?)",
                       (uid, chal.slug, now())).rowcount == 1
    db.commit()
    after = user_rank(uid)
    return jsonify(ok=True, first_solve=first, flag=flag_for(uid, chal.slug), points=chal.points,
                   rank=_rank_json(after),
                   promoted=after["tier"]["index"] > before["tier"]["index"])


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify(error="not found"), 404
    return render_template("error.html", code=404, message="Nothing haunts this page."), 404
