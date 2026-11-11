-- Piano a ritroso (t035): data dell'appello scelta dallo studente e giorni della settimana in cui studia
-- (1 = lunedì … 7 = domenica, separati da virgole). Senza data il piano non c'è.
ALTER TABLE profili_esame ADD COLUMN data_appello TEXT CHECK (data_appello IS NULL OR data_appello GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
ALTER TABLE profili_esame ADD COLUMN giorni_studio TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7';
