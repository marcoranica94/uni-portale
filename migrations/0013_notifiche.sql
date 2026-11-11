-- Notifiche (t037): iscrizioni Web Push dei dispositivi e impostazioni del portale.
-- Le chiavi VAPID le genera il Worker al primo uso e le tiene in "impostazioni".
CREATE TABLE IF NOT EXISTS iscrizioni_push (
  endpoint          TEXT PRIMARY KEY,
  p256dh            TEXT NOT NULL,
  auth              TEXT NOT NULL,
  dispositivo       TEXT NOT NULL DEFAULT '',            -- descrizione breve (es. "iPhone")
  ora               TEXT NOT NULL DEFAULT '19:00' CHECK (ora GLOB '[0-2][0-9]:[0-5][0-9]'),
  promemoria        INTEGER NOT NULL DEFAULT 1,           -- promemoria serale di studio
  correzioni        INTEGER NOT NULL DEFAULT 1,           -- avviso quando una correzione è pronta
  ultimo_promemoria TEXT,                                 -- AAAA-MM-GG, ora di Roma
  errori            INTEGER NOT NULL DEFAULT 0,
  creata            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS impostazioni (
  chiave TEXT PRIMARY KEY,
  valore TEXT NOT NULL
);
