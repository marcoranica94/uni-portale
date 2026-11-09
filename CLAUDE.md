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
- **Interfaccia:** testi in italiano, mobile-first, PWA; palette carta `#FAFAF7`, inchiostro `#1A1A1A`, accento `#1F4E8C`; serif per i titoli, sans per l'interfaccia.

## File

| Percorso | Contenuto |
| --- | --- |
| `percorso/piano-di-studi.yaml` | Piano di studi ufficiale UniBg, curriculum Economico-giuridico, coorte 2026/27: materie, CFU, modalità d'esame, programmi, regole del voto di laurea |
| `scienze-politiche/<materia>/appunti/` | Appunti HTML A4 e PDF completi, da pubblicare sul portale |
| `<corso>/esame/kit-esame.md` | Kit d'esame per materia (da creare nello Sprint 2) |
| `piattaforma/` | Codice del portale (da creare nello Sprint 0) |

Non pubblicare mai `fonti/` né `lavorazione/ocr/`: sono materiale protetto e restano solo in locale.

## Ambiente

- Mac Intel Core i5-5257U (2015), macOS 12: niente Apple Silicon, quindi niente mlx-whisper né accelerazione utile per whisper.cpp. Nello Sprint 2 una prova confronta whisper.cpp locale con Whisper di Cloudflare Workers AI.
- `claude`, `codex` e `agy` sono installati; `gh` no.

## Questioni aperte

- Firebase del progetto narraya: il file di configurazione è stato tolto dal repository (resta in locale); verificare nella console che le regole di Firestore e Storage non siano aperte.
- Date degli appelli invernali: se cadono prima del 10/01/2027, anticipare gli sprint 3 e 4.
- Chiedere alla segreteria se la scelta tra Diritto pubblico comparato e Diritto e regolazione dei mercati va fatta ora o negli anni successivi.
- Il Regolamento non dice come si contano le lodi nella media.
- Per Sociologia, Scienza politica e Sviluppo dei sistemi economici il catalogo dice "orale" ma il syllabus descrive uno scritto: vale il syllabus.
