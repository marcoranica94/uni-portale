-- Voti registrati nel libretto. Un esame per insegnamento (codice UniBg).
-- voto NULL = idoneità senza voto (es. altre attività formative).
CREATE TABLE IF NOT EXISTS voti (
  codice     TEXT PRIMARY KEY,
  voto       INTEGER CHECK (voto IS NULL OR voto BETWEEN 18 AND 30),
  lode       INTEGER NOT NULL DEFAULT 0 CHECK (lode IN (0, 1) AND (lode = 0 OR voto = 30)),
  data       TEXT NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  note       TEXT,
  aggiornato TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
