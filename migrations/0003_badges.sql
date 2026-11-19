-- Badges replace ranks. Each row: someone earned a badge, and when. Once earned, it stays.
CREATE TABLE badges (
  user_id INTEGER NOT NULL,
  badge TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge)
);
-- Anyone who had a rank already finished Chapter 1 (or was given every rank): they get Hello, World
INSERT INTO badges (user_id, badge, at) SELECT id, 'hello-world', CAST(strftime('%s', 'now') AS INTEGER) * 1000 FROM users WHERE rank >= 1;
