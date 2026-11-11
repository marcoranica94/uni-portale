# Integrazione della direzione approvata

La proposta dell’11 novembre è integrata nei componenti Astro del portale. La cartella `anteprima/` conserva il prototipo approvato; il sito usa dati, moduli e servizi esistenti.

## Interfaccia

- Navigazione orizzontale da 800 px; barra inferiore su telefono, con cinque destinazioni etichettate. Nessuna sidebar.
- Titillium Web nei pesi 400/600/700; fondo neutro più chiaro; verde d’aula concentrato sull’emiciclo.
- Home con attività del giorno prima dell’emiciclo su telefono, affiancata su desktop. Appunti come raccolta illustrata; dati di preparazione reali. Media e base di laurea compaiono quando disponibili.
- Immagini locali responsive per Diritto pubblico e Sociologia. Fonti e licenze in `public/immagini/CREDITI.md` e nella pagina Materie.
- Schede materia con accesso diretto ai capitoli; argomenti e allenamento apribili separatamente. Calendario, preparazione, kit e istruzioni restano disponibili, con collegamenti ad ancora che aprono i contenitori.
- Libretto raggruppato in anni richiudibili e riepilogo adatto allo stato senza voti. Percorso con gerarchia esplicita per anni e semestri.
- Ricerca Pagefind condivisa tra pagina dedicata e dialogo desktop. Scorciatoia `/`, chiusura con Escape, indice caricato all’apertura; la ricerca nel dialogo conserva l’URL corrente.
- Cambio rapido del tema sincronizzato con le preferenze persistenti. Notifiche e tema automatico disponibili nelle preferenze.
- Transizioni native fra documenti, feedback delle immagini e selezioni dell’emiciclo; movimento ridotto rispettato.

## Vincoli conservati

Calcoli, API, FSRS, contenuti degli appunti, schema del database, flussi di simulazione e verifica Cloudflare Access sono invariati. Non sono stati registrati voti né avviate prove sui dati reali per collaudare la grafica.

## Verifica

Il runtime Cloudflare non gira su questo Mac. Per il controllo del rendering è stata usata una configurazione temporanea ignorata da Git, con lo stesso codice Astro, prerender Node e una copia locale dello schema SQLite. Kit e nuclei derivano dai file del repository; la banca di domande della prova grafica è esplicitamente dimostrativa e non viene distribuita. Configurazione e database di prova restano fuori dai sorgenti distribuiti.

Il collaudo comprende home, catalogo, entrambe le materie con appunti, libretto, percorso, ricerca e ripasso; chiaro e scuro; larghezze 320/390/768/1024/1440 px; ricerca reale nell’indice, dialogo, tema persistente, ancore, capitoli e controlli del modulo voti senza invio. I risultati conclusivi vengono riportati alla consegna insieme alla verifica del sito pubblicato.

Esito locale conclusivo: build di produzione completata con zero errori, avvisi o suggerimenti; 36 test unitari superati; 38 viste e 21 verifiche d’interazione senza rilievi. Nessun overflow anche con testo al 200% a 320 px. Le 16 viste sottoposte ad axe non riportano violazioni WCAG A/AA tra i controlli automatici eseguiti. Report in `verifica-ui-integrata-2026-11-11.json`; il controllo automatico non sostituisce la revisione visiva o una verifica completa con tecnologie assistive.

La build di produzione continua a usare `astro.config.mjs` e Cloudflare Workers; nessuna fixture è inclusa nel suo output. Pubblicazione tramite la GitHub Action esistente, senza migrazioni aggiuntive.

## Board

Attività: integrazione UI approvata dall’utente l’11 novembre. La board esterna non è aggiornabile in questa sessione: manca ArtifactData e non ci sono documenti collegati. Questo limite non è stato aggirato dichiarando aggiornamenti non eseguiti.
