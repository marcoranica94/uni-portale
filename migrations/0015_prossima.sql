-- Orale dinamico: nuovo tipo di lavoro "prossima" (l'agente formula la domanda successiva dalle risposte).
-- SQLite non modifica i CHECK: si ricrea la tabella, come in 0007.
CREATE TABLE lavori_nuova (
  id         TEXT PRIMARY KEY,
  tipo       TEXT NOT NULL CHECK (tipo IN ('kit', 'domande', 'correzione', 'approfondimento', 'prossima')),
  codice     TEXT,
  stato      TEXT NOT NULL DEFAULT 'in_coda' CHECK (stato IN ('in_coda', 'in_corso', 'completato', 'errore')),
  richiesta  TEXT NOT NULL DEFAULT '{}',
  risultato  TEXT,
  errore     TEXT,
  agente     TEXT,
  tentativi  INTEGER NOT NULL DEFAULT 0,
  creato     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  preso      TEXT,
  concluso   TEXT
);
INSERT INTO lavori_nuova (id, tipo, codice, stato, richiesta, risultato, errore, agente, tentativi, creato, preso, concluso)
  SELECT id, tipo, codice, stato, richiesta, risultato, errore, agente, tentativi, creato, preso, concluso FROM lavori;
DROP TABLE lavori;
ALTER TABLE lavori_nuova RENAME TO lavori;
CREATE INDEX IF NOT EXISTS lavori_stato_creato ON lavori (stato, creato);
CREATE INDEX IF NOT EXISTS lavori_codice ON lavori (codice, tipo, creato);
