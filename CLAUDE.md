# Portale di studio — uni.marcoranica.com

Istruzioni per chi lavora sul portale. Valgono insieme al `CLAUDE.md` nella radice del repository, che resta la regola per gli appunti.

## Obiettivo

Un portale privato che mostra il percorso universitario (libretto, anni e semestri, appunti in PDF) e allena agli esami con simulazioni scritte e orali generate e corrette da un agente AI locale. L'utente è uno studente lavoratore: ogni schermata deve dire in pochi secondi "cosa faccio adesso".

## Link

| Cosa | Link |
| --- | --- |
| Documento di progetto (architettura, stack, simulatore, prompt Figma) | https://claude.ai/artifact/VoFWJYEYQKiYQ5v4cTjoHc |
| Piano in epiche e sprint (scheda del documento) | https://claude.ai/artifact/VoFWJYEYQKiYQ5v4cTjoHc#e2b97400-2256 |
| **Board delle attività "Cantiere Uni"** | https://claude.ai/artifact/2xNJoCCcA7W3zHrene8kat |
| Prototipo grafico (Figma Make, base di stile da rifinire) | https://www.figma.com/make/yP4hsoPNxqt3pg9zxwZrJ1/Uni-Study-Cockpit |

## Board: aggiornala sempre

La board è la fonte di verità su dove siamo. **Ogni volta** che lavori sul portale:

1. All'inizio leggi la board e lavora sulle attività dello sprint in corso.
2. Quando inizi un'attività, portala a `doing`; quando la completi secondo la definizione di fatto, portala a `done`.
3. Se emerge lavoro non previsto, aggiungilo come nuova attività con epica e sprint; se un'attività non serve più, eliminala e dillo all'utente.
4. Prima di chiudere la sessione, controlla che la board rispecchi lo stato reale e riassumi all'utente cosa è cambiato.

Come si aggiorna: strumento `ArtifactData` sull'URL della board. Collezioni:

- `epics` — documenti `E0`…`E9` con `name`, `goal`;
- `sprints` — documenti `s0`…`s7` con `name`, `short`, `start`, `end`, `goal`;
- `tasks` — documenti `t001`… con `title`, `epic`, `sprint`, `status` (`todo` | `doing` | `done`), `order`, `updatedAt`.

Leggi il documento prima di modificarlo e passa sempre `if_version`.

**Definizione di fatto:** funziona dal telefono attraverso Cloudflare Access, è in produzione, i dati sopravvivono a un ricaricamento e la demo dello sprint riesce senza ritocchi.

## Decisioni prese

- **Stack:** Astro monolitico (pagine + endpoint `src/pages/api/`) su Cloudflare Workers, database D1, Cloudflare Access per l'accesso. Tutto TypeScript, schemi Zod condivisi tra sito e agente. Costo zero.
- **Codice:** in questa cartella `piattaforma/`, nello stesso repository degli appunti. Il deploy avviene da una GitHub Action con sparse checkout (la storia Git pesa circa 0,9 GB): solo `piattaforma/`, `percorso/` e le cartelle `appunti/`.
- **Dati:** percorso, materie e kit d'esame stanno nel repository; tentativi, risposte, voti e correzioni stanno in D1, con backup notturno in un repository privato.
- **Audio:** non si salva mai. Transita solo per la trascrizione e viene cancellato subito; regola di scadenza a 7 giorni come rete di sicurezza. Si conservano solo informazioni dell'esame e risultati.
- **Agente locale:** CLI `uni-agent` che preleva la coda via API (service token di Access) e usa `claude -p`, `codex exec` o `agy -p` con output JSON vincolato a schema. Nessun costo di API. Le regole di correzione vanno scritte nel prompt inviato all'agente, perché ogni strumento legge file di istruzioni diversi.
- **Kit d'esame:** per ogni materia `<corso>/esame/kit-esame.md`, generato una volta dagli appunti (nuclei, definizioni, autori, rubrica, impronta degli appunti). Domande e correzioni partono dal kit, non da tutti gli appunti. Dalle fonti protette solo sintesi e numeri di pagina.
- **Simulazioni:** avvio con un tocco, già impostate come l'esame reale; nessun modulo lungo. Banca di domande pre-generata per poter iniziare anche a PC spento.
- **Voce:** nello scritto si usa la dettatura del browser; nell'orale la trascrizione con tempi per parola serve a misurare pause, ritmo e intercalari.
- **Versioni:** usa sempre l'ultima versione stabile di framework, librerie, CLI e runtime (niente beta, RC o canary), verificandola al momento.
- **Interfaccia:** testi in italiano, mobile-first, PWA. Direzione "Emiciclo" (10/11/2026, `src/styles/tokens.css`), scelta dopo che le prime due passate sono state bocciate perché "da AI": l'aula parlamentare. Verde d'aula per l'emiciclo e la barra laterale; i colori del tabellone di voto (verde, ambra, rosso, anello vuoto) solo per la padronanza, sempre con forma o parola; un solo carattere, Titillium Web (Pubblica amministrazione). In home l'emiciclo è la laurea (`EmicicloLaurea.astro`): 180 seggi, uno per CFU, ogni materia un gruppo cliccabile (superati pieni nel colore della materia, in corso ad anello colorato, futuri tenui), maggioranza a 91 CFU. Nella scheda materia ogni seggio è un argomento del kit; maggioranza = metà più uno di solidi. Metafora (seduta, seggi, ordine del giorno) solo dove informa. Prima di lavorare sulla grafica carica la skill `frontend-design` (`.claude/skills/`) ed evita i cliché che elenca: fondo crema, monospazio per i dati, una parola evidenziata nel titolo, etichette sopra ogni titolo, tutto in card uguali.

## File

| Percorso | Contenuto |
| --- | --- |
| `percorso/piano-di-studi.yaml` | Piano di studi ufficiale UniBg, curriculum Economico-giuridico, coorte 2026/27: materie, CFU, modalità d'esame, programmi, regole del voto di laurea |
| `scienze-politiche/<materia>/appunti/` | Appunti HTML A4 e PDF completi, da pubblicare sul portale |
| `<corso>/esame/kit-esame.md` | Kit d'esame per materia (da creare nello Sprint 2) |
| `piattaforma/` | Codice del portale (da creare nello Sprint 0) |

Non pubblicare mai `fonti/` né `lavorazione/ocr/`: sono materiale protetto e restano solo in locale.

## Ambiente e comandi

Progetto in `piattaforma/`: Astro 7, adapter `@astrojs/cloudflare` 14, Wrangler 4, TypeScript 6 (`astro check` non supporta ancora TypeScript 7), pnpm 12, Node 24 LTS.

| Comando | A cosa serve | Dove funziona |
| --- | --- | --- |
| `pnpm build` | controllo dei tipi + build | ovunque, anche sul Mac Intel |
| `pnpm dev` | server di sviluppo dentro workerd | Windows x64, Linux, macOS 13.5+; **non** sul Mac Intel con macOS 12 |
| `pnpm types` | genera `worker-configuration.d.ts` dai binding | come `pnpm dev`; il file generato va committato |
| `pnpm wrangler deploy` | pubblicazione | ovunque; di norma la fa la GitHub Action |

- Il Mac di casa è un Intel Core i5-5257U (2015) con macOS 12: Node 26 e workerd non partono. Lì si lavora con `pnpm build`; per `pnpm dev` si usa il PC Windows o la CI. Niente mlx-whisper né accelerazione utile per whisper.cpp (prova nello Sprint 2).
- `prerenderEnvironment: 'node'` in `astro.config.mjs` serve proprio a generare le pagine statiche senza workerd.
- pnpm 12 scarta le versioni pubblicate da troppo poco tempo e blocca gli script di installazione: le eccezioni stanno in `pnpm-workspace.yaml` (`allowBuilds`, `overrides`). Non aggiungere `minimumReleaseAgeExclude` per inseguire versioni uscite da poche ore.
- `claude`, `codex` e `agy` sono installati; `gh` no.
- Bash di sistema è la 3.2: niente array, niente `$(...)` annidati complessi; per logica articolata usa uno script.

## Agente locale (uni-agent)

Il telefono e il sito non parlano mai con il PC: il sito tiene una coda in D1 e `uni-agent`, sul PC, la svuota.

```
cd piattaforma
pnpm agente watch --agente claude     # oppure codex / agy; Ctrl+C per uscire
pnpm agente once                      # un solo giro di coda
pnpm agente kit sociologia            # kit senza passare dalla coda (il portale non lo registra)
pnpm agente verifica                  # credenziali e collegamento
```

- Usa `claude -p`, `codex exec`, `agy -p` con output JSON vincolato agli schemi di `src/shared/schemi.ts` (formato rigido: campi tutti obbligatori, `nullable` al posto di `optional`).
- Il kit d'esame va in `<corso>/esame/kit-esame.json` (fonte per domande e correzioni) e `.md` (lettura); l'agente committa e pusha solo quei file. L'impronta degli appunti (`scripts/impronta-appunti.mjs`) dice se il kit è aggiornato.
- Requisiti su un altro PC: repository clonato, Node 24 + pnpm (`pnpm install`), almeno una CLI tra claude/codex/agy con login fatto, `~/.config/uni-agent/access.env`.
- Kit: Sociologia 42 nuclei (~12 min), Diritto pubblico 71 nuclei (~8 min), con Claude (10/11/2026). Banca Sociologia: 126 domande (~12 min).

## Simulazioni d'esame

- **Scritto** (`/simulazioni/[id]`): domande dalla banca della materia (lavoro `domande` dell'agente, dal kit), multipla corretta subito, aperte corrette dall'agente con la rubrica. Pesi stimati: multipla 1, aperta 4; voto = punti/massimo × 30.
- **Orale** (esami orali): 3 domande aperte; il telefono registra, `/api/simulazioni/[id]/audio` trascrive con **Workers AI `@cf/openai/whisper-large-v3-turbo`** in italiano e scarta l'audio (mai salvato, niente R2); in D1 vanno solo trascrizione e metriche (`calcoli.ts/metricheParlato`). L'agente valuta contenuto (rubrica) ed esposizione (voto /10). Quota gratuita Workers AI: ~210 minuti di audio al giorno.
- **Rubrica**: deve contenere solo ciò che la domanda chiede; in correzione un punto non richiesto non toglie punti.
- **Istruzioni d'esame** (tabella `profili_esame`, sezione nella scheda materia): testo libero dello studente + numero di domande; entrano nel prompt di generazione e di correzione.
- **Banca a rifornimento**: mai generare tutta la banca in una volta. Ogni lavoro `domande` prepara ~18 domande su 6 nuclei meno coperti; il sito ne accoda un altro quando le domande mai uscite non bastano per due simulazioni (risparmia la quota degli abbonamenti).
- **Ripasso degli errori** (`/ripasso`, `lib/ripasso.ts`, `lib/fsrs.ts`): ogni multipla sbagliata o aperta sotto il 90% diventa una carta (tabella `carte`, una per domanda), creata a consegna e a correzione. Pianificazione con ts-fsrs 6 (FSRS-7, ritenzione 0,9, passi 1 e 10 minuti, niente fuzz); al massimo 20 carte nuove al giorno; le carte in ripasso scadono per giorno (mezzanotte di Roma). Il retro è la correzione di quella risposta, nessun lavoro per l'agente. Eliminando una simulazione spariscono le sue carte. I ripassi contano come giorni di studio.
- **Calendario fino all'appello** (piano a ritroso, `components/Calendario.astro`, `calcoli.ts/pianoARitroso`): data dell'appello e giorni di studio li sceglie lo studente nella scheda materia (`profili_esame.data_appello`, `giorni_studio`, endpoint `/api/appello`). I capitoli con argomenti del kit non ancora solidi si distribuiscono nell'ordine degli appunti, pesati per numero di argomenti; gli ultimi giorni di studio sono prove generali (1 se i giorni sono 3-6, poi ~15%, max 3); "stretto" oltre 1,5 capitoli per giorno. Si ricalcola a ogni visita. Oggi parte dalla materia con l'appello più vicino e cerca l'argomento da allenare nel capitolo del giorno.
- **Ricerca** (`/cerca`, tasto `/`): indice Pagefind generato dopo `astro build` (`pagefind.yml`, solo `appunti/**`, senza `.page-header`/`.page-footer`); metadati titolo e materia iniettati da `sync-appunti.mjs`, che dà anche un id stabile agli h1. Il lettore evidenzia le parole con `?evidenzia=`. Pagefind senza web worker (indice piccolo).
- **Notifiche** (`lib/notifiche.ts`, `lib/webpush.ts`, `public/sw.js`): Web Push standard aes128gcm + VAPID con sola WebCrypto (PushForge scartato: usa il vecchio aesgcm). Chiavi VAPID generate dal Worker al primo uso, in D1 (`impostazioni`). Promemoria serale all'ora scelta per dispositivo (cron `*/15` in `wrangler.jsonc`, entrata `src/worker.ts`), solo se ci sono carte o un capitolo del calendario; avviso di correzione pronta da `api/agente/completa`. Su iPhone servono l'app sulla schermata Home e un login di Access dentro l'app. Il manifest si chiede con `crossorigin="use-credentials"` per via di Access.
- **Collaudo**: audio di prova con `say -v Luca -o x.m4a --file-format=m4af --data-format=aac "..."` (le pause con `[[slnc 2500]]`), poi POST con `scripts/uni-curl.sh`. Le simulazioni di prova vanno eliminate a fine collaudo.

## Provare il sito online

Il sito è dietro Cloudflare Access. Per provarlo da qui si usa il service token `uni-agent` (policy "Agente locale", azione Service Auth):

- credenziali in `~/.config/uni-agent/access.env` (`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`), file con permessi 600;
- `piattaforma/scripts/uni-curl.sh /percorso [opzioni di curl]` chiama il sito con il token e risolve il nome con 1.1.1.1;
- **mai stampare, copiare o committare il secret**; al massimo verificarne lunghezza e formato;
- le scritture reali (voti) si fanno solo se l'utente lo chiede: i dati sono suoi.


## Questioni aperte

- Firebase del progetto narraya: il file di configurazione è stato tolto dal repository (resta in locale); verificare nella console che le regole di Firestore e Storage non siano aperte.
- Date degli appelli invernali: se cadono prima del 10/01/2027, anticipare gli sprint 3 e 4.
- Chiedere alla segreteria se la scelta tra Diritto pubblico comparato e Diritto e regolazione dei mercati va fatta ora o negli anni successivi.
- Il Regolamento non dice come si contano le lodi nella media.
- Per Sociologia, Scienza politica e Sviluppo dei sistemi economici il catalogo dice "orale" ma il syllabus descrive uno scritto: vale il syllabus.
