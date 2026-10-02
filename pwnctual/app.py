import base64
import hashlib
import hmac
import json
import os
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
from .curriculum import CHALLENGES, CHAPTERS, CHAPTERS_BY_ID, TOTAL_POINTS
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
PUBLIC_URL = os.environ.get("PWNCTUAL_PUBLIC_URL", "").rstrip("/")
PRO_PRICE = os.environ.get("PWNCTUAL_PRO_PRICE", "$10")
PRO_DAYS = 30
# Pro is a Stripe subscription: Checkout to subscribe, the Customer Portal to
# cancel or change card, and a signed webhook that keeps users.pro_until in sync.
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_ENABLED = bool(STRIPE_SECRET_KEY and STRIPE_PRICE_ID)
# Without Stripe, an external payment link can sell Pro instead (granted by hand);
# with neither, the Pro button says checkout opens soon.
CHECKOUT_URL = os.environ.get("PWNCTUAL_CHECKOUT_URL", "")
# Live classes: video link shown to people who booked (e.g. a Google Meet room),
# and the logins allowed to see every booking at /classes/admin.
CLASS_MEET_URL = os.environ.get("PWNCTUAL_CLASS_MEET_URL", "")
ADMINS = {x.strip().lower() for x in os.environ.get("PWNCTUAL_ADMINS", "").split(",") if x.strip()}

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


def video_embed(url):
    """Embeddable player URL for a YouTube link, or None for anything else."""
    u = urllib.parse.urlparse(url or "")
    host = u.netloc.lower().removeprefix("www.").removeprefix("m.")
    vid = None
    if host == "youtu.be":
        vid = u.path.strip("/")
    elif host == "youtube.com":
        if u.path == "/watch":
            vid = urllib.parse.parse_qs(u.query).get("v", [None])[0]
        elif u.path.startswith(("/embed/", "/shorts/", "/live/")):
            vid = u.path.split("/")[2]
    if not vid or not all(c.isalnum() or c in "-_" for c in vid):
        return None
    # The standard player (not youtube-nocookie) so the video shows ads and earns like a normal view;
    # rel=0 keeps the end-screen suggestions to our own channel.
    return f"https://www.youtube.com/embed/{vid}?rel=0"


def now():
    return time.time()


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


def asset(name):
    full = os.path.join(app.static_folder, name)
    v = int(os.path.getmtime(full)) if os.path.exists(full) else 0
    return url_for("static", filename=name, v=v)


@app.context_processor
def inject():
    user = current_user()
    ctx = {
        "me": user, "csrf_token": csrf_token, "asset": asset, "md": md, "emblem": lambda t, size=96: Markup(emblem(t, size)),
        "CHAPTERS": CHAPTERS, "TOTAL_POINTS": TOTAL_POINTS, "RANK_COUNT": len(TIERS), "DEV_LOGIN": DEV_LOGIN,
        "GITHUB_ENABLED": bool(GITHUB_CLIENT_ID), "GOOGLE_ENABLED": bool(GOOGLE_CLIENT_ID),
        "my_rank": None, "my_solved": {},
        "IS_PRO": is_pro(user), "PRO_PRICE": PRO_PRICE, "PRO_DAYS": PRO_DAYS,
        "CHECKOUT_URL": CHECKOUT_URL, "STRIPE_ENABLED": STRIPE_ENABLED,
        "video_embed": video_embed, "IS_ADMIN": is_admin(user),
        "pro_until": (time.strftime("%d %b %Y", time.localtime(user["pro_until"]))
                      if is_pro(user) else None),
        "pro_renews": is_pro(user) and bool(user["pro_renews"]),
        "has_billing": bool(user) and STRIPE_ENABLED and bool(user["stripe_customer_id"]),
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


def _my_bookings(uid, upcoming_only=True, meet_url=None):
    q = "SELECT id, start_ts, note FROM class_bookings WHERE user_id=? AND cancelled_at IS NULL"
    if upcoming_only:
        q += f" AND start_ts + {cls.SLOT_MINUTES * 60} > ?"
        rows = dbm.get_db().execute(q + " ORDER BY start_ts", (uid, int(now()))).fetchall()
    else:
        rows = dbm.get_db().execute(q + " ORDER BY start_ts", (uid,)).fetchall()
    return [{"id": r["id"], "t": r["start_ts"], "note": r["note"] or "", "meet_url": meet_url or ""} for r in rows]


def _bookings_for(user):
    """A user's upcoming calls; the video link is only shared while they have Pro."""
    return _my_bookings(user["id"], meet_url=CLASS_MEET_URL if (is_pro(user) or is_admin(user)) else None)


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
        signed_in=bool(user), mine=_bookings_for(user) if user else [],
        can_book=bool(user) and (is_pro(user) or is_admin(user)),
    )


@app.post("/api/classes/book")
def api_class_book():
    user = current_user()
    if not user:
        return jsonify(error="Sign in to book a 1-on-1 call."), 401
    check_csrf()
    if not (is_pro(user) or is_admin(user)):
        return jsonify(error=f"1-on-1 calls are part of pwnctual Pro ({PRO_PRICE}/month)."), 402
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
    return jsonify(ok=True, mine=_bookings_for(user))


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
    return jsonify(ok=True, mine=_bookings_for(user))


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
    return render_template("pricing.html", billing_note=session.pop("billing_note", None))


# ------------------------------------------------------------------ Pro billing (Stripe)

def _stripe(method, path, params=None):
    """Call the Stripe API (form-encoded; nested keys written out like 'line_items[0][price]')."""
    url = "https://api.stripe.com/v1/" + path
    body = None
    if params and method == "GET":
        url += "?" + urllib.parse.urlencode(params)
    elif params:
        body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": f"Bearer {STRIPE_SECRET_KEY}", "Stripe-Version": "2025-03-31.basil"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.load(resp)


def _period_end(sub):
    # Since API version 2025-03-31 the billing period lives on the subscription items.
    items = (sub.get("items") or {}).get("data") or []
    ends = [i["current_period_end"] for i in items if i.get("current_period_end")]
    return max(ends) if ends else sub.get("current_period_end")


def _apply_subscription(sub):
    """Make a user's Pro match a Stripe subscription. Idempotent, so webhook retries,
    duplicates and out-of-order events are harmless: the subscription is always
    re-read from Stripe and its current state wins."""
    db = dbm.get_db()
    row = db.execute("SELECT id, pro_until FROM users WHERE stripe_customer_id=?", (sub["customer"],)).fetchone()
    if row is None:
        uid = (sub.get("metadata") or {}).get("user_id")
        row = db.execute("SELECT id, pro_until FROM users WHERE id=?", (uid,)).fetchone() if uid else None
        if row is None:
            return None
        db.execute("UPDATE users SET stripe_customer_id=? WHERE id=?", (sub["customer"], row["id"]))
    until = row["pro_until"] or 0
    if sub["status"] in ("active", "trialing"):
        # Paid up: Pro runs to the end of the paid period (never shortening time granted by hand).
        until = max(until, _period_end(sub) or 0)
        renews = not sub.get("cancel_at_period_end") and not sub.get("cancel_at")
    elif sub["status"] in ("canceled", "unpaid", "incomplete_expired"):
        until, renews = min(until, now()), False
    else:
        # past_due / incomplete / paused: keep what was already paid for, don't extend.
        renews = False
    db.execute("UPDATE users SET pro_until=?, pro_renews=?, stripe_subscription_id=? WHERE id=?",
               (until, int(renews), sub["id"], row["id"]))
    db.commit()
    return row["id"]


def _sync_subscription(sub_id):
    return _apply_subscription(_stripe("GET", f"subscriptions/{urllib.parse.quote(sub_id)}"))


@app.post("/billing/checkout")
def billing_checkout():
    user = current_user()
    if not user:
        return redirect(url_for("login", next="/pricing"))
    check_csrf()
    if not STRIPE_ENABLED:
        abort(404)
    if is_pro(user) and user["pro_renews"]:
        return redirect("/pricing")
    params = {
        "mode": "subscription",
        "line_items[0][price]": STRIPE_PRICE_ID,
        "line_items[0][quantity]": 1,
        "client_reference_id": str(user["id"]),
        "metadata[user_id]": str(user["id"]),
        "subscription_data[metadata][user_id]": str(user["id"]),
        "success_url": base_url() + "/billing/success?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": base_url() + "/pricing",
    }
    if user["stripe_customer_id"]:
        params["customer"] = user["stripe_customer_id"]
    elif user["email"]:
        params["customer_email"] = user["email"]
    try:
        cs = _stripe("POST", "checkout/sessions", params)
    except (urllib.error.URLError, ValueError):
        session["billing_note"] = "Couldn't open checkout. Please try again in a moment."
        return redirect("/pricing")
    return redirect(cs["url"], code=303)


@app.get("/billing/success")
def billing_success():
    """Stripe sends people here after paying. Sync right away so Pro is on before the
    webhook arrives (the webhook stays the source of truth for renewals and cancels)."""
    user = current_user()
    sid = request.args.get("session_id", "")
    if user and STRIPE_ENABLED and sid.startswith("cs_"):
        try:
            cs = _stripe("GET", f"checkout/sessions/{urllib.parse.quote(sid)}")
            if cs.get("client_reference_id") == str(user["id"]) and cs.get("subscription"):
                db = dbm.get_db()
                db.execute("UPDATE users SET stripe_customer_id=? WHERE id=?", (cs["customer"], user["id"]))
                db.commit()
                _sync_subscription(cs["subscription"])
                session["billing_note"] = "Welcome to Pro! You can book a 1-on-1 call now."
        except (urllib.error.URLError, ValueError, KeyError):
            session["billing_note"] = "Payment received. Pro will switch on in a minute."
    return redirect("/pricing")


@app.post("/billing/portal")
def billing_portal():
    user = current_user()
    if not user:
        return redirect(url_for("login", next="/pricing"))
    check_csrf()
    if not (STRIPE_ENABLED and user["stripe_customer_id"]):
        abort(404)
    try:
        ps = _stripe("POST", "billing_portal/sessions",
                     {"customer": user["stripe_customer_id"], "return_url": base_url() + "/pricing"})
    except (urllib.error.URLError, ValueError):
        session["billing_note"] = "Couldn't open billing. Please try again in a moment."
        return redirect("/pricing")
    return redirect(ps["url"], code=303)


def _stripe_signature_ok(payload, header, tolerance=300):
    parts = [p.split("=", 1) for p in header.split(",") if "=" in p]
    ts = next((v for k, v in parts if k == "t"), "")
    sigs = [v for k, v in parts if k == "v1"]
    if not ts.isdigit() or abs(now() - int(ts)) > tolerance:
        return False
    expected = hmac.new(STRIPE_WEBHOOK_SECRET.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in sigs)


@app.post("/stripe/webhook")
def stripe_webhook():
    if not (STRIPE_ENABLED and STRIPE_WEBHOOK_SECRET):
        abort(404)
    payload = request.get_data()
    if not _stripe_signature_ok(payload, request.headers.get("Stripe-Signature", "")):
        return jsonify(error="bad signature"), 400
    event = json.loads(payload)
    obj = event.get("data", {}).get("object", {})
    kind = event.get("type", "")
    sub_id = None
    if kind == "checkout.session.completed" and obj.get("mode") == "subscription":
        uid = obj.get("client_reference_id")
        if uid and obj.get("customer"):
            db = dbm.get_db()
            db.execute("UPDATE users SET stripe_customer_id=? WHERE id=? AND stripe_customer_id IS NULL",
                       (obj["customer"], uid))
            db.commit()
        sub_id = obj.get("subscription")
    elif kind.startswith("customer.subscription."):
        sub_id = obj.get("id")
    elif kind in ("invoice.paid", "invoice.payment_failed"):
        sub_id = ((obj.get("parent") or {}).get("subscription_details") or {}).get("subscription") or obj.get("subscription")
    if sub_id:
        try:
            _sync_subscription(sub_id)
        except (urllib.error.URLError, ValueError, KeyError):
            return jsonify(error="sync failed"), 500  # Stripe retries
    return jsonify(ok=True)


@app.get("/course")
def course():
    solved = solved_slugs(current_user()["id"]) if current_user() else {}
    up_next = next((ch for ch in CHAPTERS if any(c.slug not in solved for c in ch.challenges)), None)
    return render_template("course.html", up_next=up_next if current_user() else None)


@app.get("/chapters/<chapter_id>")
def chapter_page(chapter_id):
    chapter = CHAPTERS_BY_ID.get(chapter_id) or abort(404)
    i = CHAPTERS.index(chapter)
    return render_template("chapter.html", chapter=chapter,
                           prev=CHAPTERS[i - 1] if i > 0 else None,
                           nxt=CHAPTERS[i + 1] if i + 1 < len(CHAPTERS) else None)


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


@app.post("/api/challenges/<slug>/done")
def api_challenge_done(slug):
    user = current_user()
    if not user:
        return jsonify(error="not logged in"), 401
    check_csrf()
    c = CHALLENGES.get(slug)
    if not c:
        return jsonify(error="unknown challenge"), 404
    before = user_rank(user["id"])
    db = dbm.get_db()
    db.execute("INSERT OR IGNORE INTO solves (user_id, slug, solved_at) VALUES (?,?,?)", (user["id"], slug, now()))
    db.commit()
    after = user_rank(user["id"])
    return jsonify(ok=True, points=c.points, rank=after["tier"]["label"], rank_key=after["tier"]["key"],
                   rank_index=after["tier"]["index"], promoted=after["tier"]["index"] > before["tier"]["index"])


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify(error="not found"), 404
    return render_template("error.html", code=404, message="Nothing haunts this page."), 404
