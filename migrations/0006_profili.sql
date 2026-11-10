-- Istruzioni d'esame scritte dallo studente per ogni materia: indirizzano domande, correzione e numero di domande.
CREATE TABLE IF NOT EXISTS profili_esame (
  codice          TEXT PRIMARY KEY,
  istruzioni      TEXT NOT NULL DEFAULT '',
  domande_orale   INTEGER NOT NULL DEFAULT 3 CHECK (domande_orale BETWEEN 1 AND 8),
  multiple_scritto INTEGER NOT NULL DEFAULT 10 CHECK (multiple_scritto BETWEEN 0 AND 30),
  aperte_scritto  INTEGER NOT NULL DEFAULT 3 CHECK (aperte_scritto BETWEEN 0 AND 8),
  aggiornato      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
