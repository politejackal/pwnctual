import os
import sqlite3

from flask import g

DB_PATH = os.environ.get("PWNCTUAL_DB", os.path.join(os.path.dirname(__file__), "..", "pwnctual.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    github_id INTEGER UNIQUE,
    login TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS solves (
    user_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    solved_at REAL NOT NULL,
    PRIMARY KEY (user_id, slug)
);
CREATE TABLE IF NOT EXISTS class_bookings (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    start_ts INTEGER NOT NULL,
    note TEXT,
    created_at REAL NOT NULL,
    cancelled_at REAL
);
-- one live booking per slot, enforced by the database itself
CREATE UNIQUE INDEX IF NOT EXISTS class_slot_taken ON class_bookings(start_ts) WHERE cancelled_at IS NULL;
"""


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
    return g.db


def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


MIGRATIONS = [
    # (column, DDL) added after the first release; applied in place on old databases
    ("google_sub", "ALTER TABLE users ADD COLUMN google_sub TEXT"),
    ("email", "ALTER TABLE users ADD COLUMN email TEXT"),
    ("pro_until", "ALTER TABLE users ADD COLUMN pro_until REAL"),
    ("stripe_customer_id", "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT"),
    ("stripe_subscription_id", "ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT"),
    ("pro_renews", "ALTER TABLE users ADD COLUMN pro_renews INTEGER NOT NULL DEFAULT 0"),
]


def init_db():
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)
    cols = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    for col, ddl in MIGRATIONS:
        if col not in cols:
            con.execute(ddl)
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users(google_sub)")
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer ON users(stripe_customer_id)")
    con.commit()
    con.close()
