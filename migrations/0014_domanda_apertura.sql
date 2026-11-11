-- Prima domanda fissa dell'orale, scelta dallo studente (es. l'argomento a piacere su cui ha approfondito).
-- Diventa una domanda "aperta" della banca con nucleo APERTURA: esce sempre per prima e non viene mai pescata a caso.
ALTER TABLE profili_esame ADD COLUMN domanda_apertura TEXT NOT NULL DEFAULT '';
