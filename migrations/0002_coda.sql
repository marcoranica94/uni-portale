-- Coda dei lavori per l'agente locale (kit d'esame, poi domande e correzioni).
CREATE TABLE IF NOT EXISTS lavori (
  id         TEXT PRIMARY KEY,
  tipo       TEXT NOT NULL CHECK (tipo IN ('kit', 'domande', 'correzione')),
  codice     TEXT,                                   -- insegnamento (codice UniBg)
  stato      TEXT NOT NULL DEFAULT 'in_coda' CHECK (stato IN ('in_coda', 'in_corso', 'completato', 'errore')),
  richiesta  TEXT NOT NULL DEFAULT '{}',             -- JSON con i parametri
  risultato  TEXT,                                   -- JSON prodotto dall'agente
  errore     TEXT,
  agente     TEXT,                                   -- es. "claude@MacBook"
  tentativi  INTEGER NOT NULL DEFAULT 0,
  creato     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  preso      TEXT,
  concluso   TEXT
);
CREATE INDEX IF NOT EXISTS lavori_stato_creato ON lavori (stato, creato);
CREATE INDEX IF NOT EXISTS lavori_codice ON lavori (codice, tipo, creato);

-- Ultimo contatto di ogni agente locale: serve all'indicatore online/offline.
CREATE TABLE IF NOT EXISTS agenti (
  id              TEXT PRIMARY KEY,                  -- "<agente>@<host>"
  ultimo_contatto TEXT NOT NULL,
  versione        TEXT
);

-- Kit d'esame generati: l'impronta dice da quali appunti nascono.
CREATE TABLE IF NOT EXISTS kit (
  codice    TEXT PRIMARY KEY,
  impronta  TEXT NOT NULL,
  nuclei    INTEGER NOT NULL,
  commit_git TEXT,
  agente    TEXT,
  generato  TEXT NOT NULL
);
