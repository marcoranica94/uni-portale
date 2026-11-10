-- Banca di domande generata dal kit d'esame (lavoro "domande" dell'agente locale).
CREATE TABLE IF NOT EXISTS domande (
  id          TEXT PRIMARY KEY,
  codice      TEXT NOT NULL,                       -- insegnamento
  nucleo      TEXT NOT NULL,                       -- es. "N07" del kit
  tipo        TEXT NOT NULL CHECK (tipo IN ('multipla', 'aperta')),
  testo       TEXT NOT NULL,
  opzioni     TEXT NOT NULL DEFAULT '[]',          -- JSON: solo per "multipla"
  corretta    INTEGER,                             -- indice dell'opzione giusta (multipla)
  spiegazione TEXT NOT NULL DEFAULT '',
  punti_chiave TEXT NOT NULL DEFAULT '[]',         -- JSON: rubrica (aperta)
  risposta_modello TEXT NOT NULL DEFAULT '',
  file        TEXT NOT NULL DEFAULT '',            -- pagina degli appunti
  pagine      TEXT NOT NULL DEFAULT '',
  usata       INTEGER NOT NULL DEFAULT 0,          -- quante volte è uscita
  lotto       TEXT NOT NULL,                       -- generazione da cui nasce
  creata      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS domande_codice ON domande (codice, tipo, usata);

-- Simulazioni d'esame e risposte.
CREATE TABLE IF NOT EXISTS simulazioni (
  id         TEXT PRIMARY KEY,
  codice     TEXT NOT NULL,
  formato    TEXT NOT NULL CHECK (formato IN ('breve', 'completo')),
  stato      TEXT NOT NULL DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'in_correzione', 'corretta')),
  minuti     INTEGER NOT NULL,
  creata     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  consegnata TEXT,
  corretta   TEXT,
  punti      REAL,
  massimo    REAL,
  voto       INTEGER,                              -- in trentesimi, stimato
  giudizio   TEXT
);
CREATE INDEX IF NOT EXISTS simulazioni_codice ON simulazioni (codice, creata);

CREATE TABLE IF NOT EXISTS risposte (
  simulazione TEXT NOT NULL,
  ordine      INTEGER NOT NULL,
  domanda     TEXT NOT NULL,
  risposta    TEXT,                                -- testo, o indice per la multipla
  punti       REAL,
  massimo     REAL NOT NULL,
  esito       TEXT,                                -- JSON della correzione
  PRIMARY KEY (simulazione, ordine)
);
