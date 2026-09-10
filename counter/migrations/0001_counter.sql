CREATE TABLE totals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  spins INTEGER NOT NULL DEFAULT 0 CHECK (spins >= 0)
);
INSERT INTO totals (id, spins) VALUES (1, 0);
CREATE TABLE completed_spins (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TRIGGER count_completed_spin AFTER INSERT ON completed_spins
BEGIN
  UPDATE totals SET spins = spins + 1 WHERE id = 1;
END;
