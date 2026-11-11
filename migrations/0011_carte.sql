-- Ripasso degli errori (t032): ogni domanda sbagliata in una simulazione diventa una carta, ripassata con FSRS.
-- Una carta per domanda; se la domanda viene sbagliata di nuovo, la stessa carta torna subito in ripasso.
CREATE TABLE IF NOT EXISTS carte (
  id          TEXT PRIMARY KEY,
  codice      TEXT NOT NULL,                     -- insegnamento
  domanda     TEXT NOT NULL UNIQUE,              -- domande.id
  simulazione TEXT NOT NULL,                     -- ultima simulazione in cui è stata sbagliata
  ordine      INTEGER NOT NULL,                  -- posizione della risposta in quella simulazione
  scadenza    TEXT NOT NULL,                     -- ISO: quando torna
  fsrs        TEXT,                              -- JSON della carta FSRS; NULL = mai ripassata
  ripassi     INTEGER NOT NULL DEFAULT 0,
  archiviata  INTEGER NOT NULL DEFAULT 0,        -- tolta dal ripasso dallo studente
  creata      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS carte_scadenza ON carte (archiviata, scadenza);

-- Registro dei ripassi: serve al limite di carte nuove al giorno e ai giorni di studio.
CREATE TABLE IF NOT EXISTS ripassi (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  carta  TEXT NOT NULL,
  codice TEXT NOT NULL,
  quando TEXT NOT NULL,
  giorno TEXT NOT NULL,                          -- AAAA-MM-GG, ora di Roma
  voto   INTEGER NOT NULL CHECK (voto BETWEEN 1 AND 4),
  nuova  INTEGER NOT NULL DEFAULT 0              -- 1 se era il primo ripasso della carta
);
CREATE INDEX IF NOT EXISTS ripassi_giorno ON ripassi (giorno);

-- Carte dagli errori già corretti: multipla sbagliata, aperta sotto il 90% dei punti (la soglia di "solido").
INSERT OR IGNORE INTO carte (id, codice, domanda, simulazione, ordine, scadenza)
SELECT lower(hex(randomblob(16))), s.codice, r.domanda, r.simulazione, r.ordine, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM risposte r JOIN simulazioni s ON s.id = r.simulazione JOIN domande d ON d.id = r.domanda
 WHERE r.punti IS NOT NULL AND d.archiviata = 0 AND r.punti < r.massimo * 0.9
 ORDER BY s.creata DESC;
