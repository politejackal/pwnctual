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
-- challenges the learner says they finished (honor system, nothing is checked)
CREATE TABLE IF NOT EXISTS solves (
    user_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    solved_at REAL NOT NULL,
    PRIMARY KEY (user_id, slug)
);
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
]


def init_db():
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)
    con.execute("DROP TABLE IF EXISTS class_bookings")  # live classes were removed
    cols = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    for col, ddl in MIGRATIONS:
        if col not in cols:
            con.execute(ddl)
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users(google_sub)")
    con.commit()
    con.close()
