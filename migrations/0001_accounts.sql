-- Accounts: everyone signs in with GitHub
CREATE TABLE users (
  id INTEGER PRIMARY KEY,                  -- GitHub user id
  login TEXT NOT NULL UNIQUE COLLATE NOCASE, -- GitHub username, used in /u/<login>
  name TEXT,
  avatar TEXT,
  created_at INTEGER NOT NULL
);

-- Signed-in browsers. Only a hash of the cookie is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Finished lessons and solved challenges
CREATE TABLE completions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson TEXT NOT NULL,                    -- chapter/module/lesson
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, lesson)
);
