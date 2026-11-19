-- The highest rank someone has earned (0 Common ... 4 Mythic). It never goes down.
ALTER TABLE users ADD COLUMN rank INTEGER NOT NULL DEFAULT 0;
