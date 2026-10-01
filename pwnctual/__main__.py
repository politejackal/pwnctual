"""python -m pwnctual                     run the dev server
python -m pwnctual grant-pro LOGIN [--days N]   give a user Pro (adds to any time left)
python -m pwnctual revoke-pro LOGIN             end a user's Pro now"""
import argparse
import os
import sqlite3
import time

from . import db as dbm
from .app import PRO_DAYS, app


def _set_pro(login, days):
    con = sqlite3.connect(dbm.DB_PATH)
    row = con.execute("SELECT id, pro_until FROM users WHERE login=?", (login,)).fetchone()
    if not row:
        raise SystemExit(f"no user '{login}'")
    if days is None:
        until = None
    else:
        until = max(row[1] or 0, time.time()) + days * 86400
    con.execute("UPDATE users SET pro_until=? WHERE id=?", (until, row[0]))
    con.commit()
    print(f"{login}: " + (f"Pro until {time.strftime('%d %b %Y', time.localtime(until))}" if until else "Pro revoked"))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(prog="python -m pwnctual")
    sub = ap.add_subparsers(dest="cmd")
    g = sub.add_parser("grant-pro", help="give a user Pro access")
    g.add_argument("login")
    g.add_argument("--days", type=int, default=PRO_DAYS)
    r = sub.add_parser("revoke-pro", help="end a user's Pro access")
    r.add_argument("login")
    args = ap.parse_args()
    if args.cmd == "grant-pro":
        _set_pro(args.login, args.days)
    elif args.cmd == "revoke-pro":
        _set_pro(args.login, None)
    else:
        app.run(host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "5000")),
                debug=os.environ.get("PWNCTUAL_DEV") == "1")
