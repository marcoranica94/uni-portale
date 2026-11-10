-- Domande archiviate: restano nel database e nello storico, ma non vengono più pescate.
ALTER TABLE domande ADD COLUMN archiviata INTEGER NOT NULL DEFAULT 0;
-- 10/11/2026: le aperte di Diritto pubblico della prima generazione sono troppo lunghe per un orale.
UPDATE domande SET archiviata = 1 WHERE codice = 'SP-70001' AND tipo = 'aperta';
