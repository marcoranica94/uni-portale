-- Simulazione orale: modalità della simulazione, valutazione dell'esposizione, metriche del parlato.
-- L'audio non si salva mai: in risposte.risposta va solo la trascrizione.
ALTER TABLE simulazioni ADD COLUMN modalita TEXT NOT NULL DEFAULT 'scritto';
ALTER TABLE simulazioni ADD COLUMN esposizione TEXT;
ALTER TABLE risposte ADD COLUMN metriche TEXT;
