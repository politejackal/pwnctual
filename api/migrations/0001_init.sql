-- No sign-up: the browser gets a random token on first visit.
-- Only a SHA-256 hash of the token is stored.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX users_ip_created ON users (ip_hash, created_at);

CREATE TABLE progress (
  user_id INTEGER NOT NULL REFERENCES users (id),
  level_id TEXT NOT NULL,
  solved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, level_id)
);

-- One row per submission, used for rate limiting.
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  level_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  passed INTEGER
);
CREATE INDEX submissions_user_created ON submissions (user_id, created_at);
