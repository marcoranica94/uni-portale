# UI del portale Uni: valutazione e direzione proposta

11 novembre 2026. Questa proposta riguarda la presentazione del portale di studio, non i contenuti degli appunti. Aggiorna la direzione delle proposte precedenti; conserva l’emiciclo e tratta il resto come un progetto da ricomporre.

**Giudizio:** l’emiciclo ha un’identità riconoscibile; il resto dell’interfaccia sembra ancora una somma di componenti. La distanza di qualità fra quel diagramma e le altre schermate è il problema centrale. Aggiungere immagini e movimento ai contenitori attuali migliorerebbe alcuni dettagli, ma lascerebbe irrisolta la composizione.

**Proposta:** un ambiente di studio con immagini editoriali, navigazione orizzontale discreta e gerarchie più decise. Verde profondo per l’emiciclo; superfici neutre nel resto dell’applicazione; fotografie legate alle materie; impostazioni disponibili quando servono. L’esperienza deve essere piacevole anche quando i dati sono ancora pochi.

## Che cosa ho verificato

Accesso al sito reale tramite il service token Cloudflare già configurato, senza esporre o copiare le credenziali. Visitate `/`, `/materie`, `/materie/sociologia`, `/percorso`, `/libretto`, `/cerca`, a 1440 e 390 px di larghezza, con viewport alta 960 px; aggiunta una cattura della home mobile in scuro. Tutte le dodici visite hanno restituito HTTP 200 e nessuna ha mostrato overflow orizzontale.

Letti layout, navigazione, token, stili condivisi, home, catalogo, percorso, libretto e componente dell’emiciclo; consultate le ricerche già presenti nel progetto. Le schermate e le misure sono in [audit-2026-11-11](audit-2026-11-11/).

La valutazione estetica seguente è un giudizio progettuale, non un punteggio di accessibilità o un test con utenti.

| Aspetto | Valutazione | Motivo |
| --- | --- | --- |
| Identità dell’emiciclo | 8/10 | Metafora pertinente a Scienze politiche; seggi collegati a dati reali; interazione comprensibile. |
| Navigazione desktop | 4/10 | 224 px di larghezza permanente per cinque destinazioni. Una superficie verde molto visibile ma quasi vuota. |
| Composizione della home | 5/10 | Un buon elemento principale accanto a una pila di riquadri di pari trattamento. Il peso visivo non segue sempre il compito. |
| Catalogo delle materie | 4/10 | Nomi e quadratini colorati; riconoscibilità visiva minima; somiglia al percorso e al libretto. |
| Scheda materia | 5/10 | Informazioni utili, ma studio, diagnostica e configurazione si contendono lo stesso spazio. |
| Tipografia | 5/10 | Titillium è coerente col soggetto; il peso 900, usato come grassetto generale, rende troppi titoli e numeri massicci. |
| Immagini | 2/10 | Zero elementi `img` nelle sei pagine analizzate. Gli SVG dell’emiciclo e delle icone sono presenti: manca un secondo linguaggio visivo. |
| Movimento | 4/10 | Alcuni feedback esistono già; manca una regia percepibile fra navigazione, selezione e avanzamento. |

## I problemi concreti

### Il menu si prende la scena

La sidebar misura 224 × 960 px nella cattura desktop: circa il 15,6% della larghezza. Il verde è lo stesso dell’emiciclo, quindi compete con l’elemento migliore del sito. La soluzione preferita è una barra orizzontale alta 64–68 px, con voci leggibili e ricerca a destra. Una rail di sole icone recupererebbe spazio, ma introdurrebbe un costo di riconoscimento evitabile con così poche destinazioni.

Su telefono la barra in basso attuale è sensata. Nella versione definitiva la conserverei, con aree di tocco di almeno 44 px, etichette visibili e safe area. Non serve duplicarla con un secondo menu completo in alto. L’anteprima prova una variante compatta superiore per confrontare l’impatto visivo: è una decisione ancora da verificare sul dispositivo, non una prescrizione definitiva.

### La gerarchia non distingue studio e gestione

La home mobile mette una grande rappresentazione dell’intera laurea prima dell’azione del giorno. È bella, ma obbliga a superare molta pagina prima di iniziare. Propongo ordine diverso per dispositivo: su desktop emiciclo a sinistra e azione a destra; su telefono azione del giorno, ripasso e poi emiciclo compatto.

La scheda di Sociologia misura circa **3063 px su desktop e 4470 px su telefono**, inclusi footer e spazi. Nella prima schermata mobile si vede soprattutto l’emiciclo. Capitoli, calendario, kit, istruzioni e programma diventano un percorso verticale lungo. Non va risolto rimpicciolendo tutto: va scelto che cosa mostrare subito.

### Materie, percorso e libretto si assomigliano troppo

Hanno scopi differenti, quindi meritano forme differenti:

- **Materie:** scegliere che cosa studiare; immagini e titoli riconoscibili.
- **Percorso:** orientarsi fra anni e semestri; sequenza, progressione, stato corrente.
- **Libretto:** consultare e registrare risultati; numeri allineati, righe compatte e riepilogo chiaro.

Imporre la stessa lista con pallino e filetto a tutte e tre le pagine impoverisce l’esperienza. Anche eliminare indiscriminatamente le card, come reazione ai template, produce uniformità.

### Verde e grassetto fanno quasi tutto il lavoro

Non cambierei subito famiglia tipografica: Titillium ha una ragione nel progetto. Proverei prima 400 per il testo, 600 per titoli e controlli, 700 per le poche enfasi. Il 900 può restare come eccezione nel mondo dell’emiciclo, non come firma di ogni intestazione.

Il fondo attuale è tinto di verde e quasi tutto il testo vira al verde. Propongo neutri meno caratterizzati per far emergere il verde d’aula e i colori reali delle immagini. Il rosso dell’etichetta “Ordine del giorno” suggerisce un allarme anche quando indica soltanto la prossima attività: lo riserverei agli errori.

## Direzione visiva

### Palette e carattere

| Ruolo | Colore di partenza |
| --- | --- |
| Fondo | `#F8FAF8` |
| Superficie | `#FFFFFF` |
| Testo | `#182C24` |
| Testo secondario | `#58665F` |
| Separatore | `#DBE3DD` |
| Aula | `#0F3D2E` |

Sono i valori della prova, da verificare sui singoli abbinamenti quando si integra il tema definitivo. I colori di padronanza rimangono semanticamente distinti e accompagnati da parole o forme. La dark mode mantiene la stessa gerarchia, con fotografie naturali e superfici differenziate; non basta invertire lo sfondo.

Scala proposta: 13–14 px per metadati, 16–17 per corpo e controlli, 22–24 per sezioni, 30–44 per titoli di pagina. Allineamento a sinistra; testi descrittivi entro circa 45–65 caratteri per riga. Cifre tabellari dove si confrontano risultati.

### Immagini: un sistema, non riempitivi

Ogni materia con appunti può avere una propria immagine. Diritto pubblico: luoghi delle istituzioni italiane. Sociologia: fotografia documentaria di società e vita urbana. Storia delle dottrine: documenti o ritratti pertinenti, selezionati dal contenuto reale. Non immagini intercambiabili di scrivanie, libri o studenti sorridenti.

Una foto deve aiutare a ritrovare una materia al secondo accesso. Non serve ripeterla in ogni capitolo e non va inserita nelle schermate di esame dove sottrarrebbe concentrazione. Nessuna immagine decorativa in una tabella del libretto.

Nell’anteprima ho usato due immagini vere, con asset locali e crediti: Montecitorio di Rémi Jouan, da Wikimedia Commons, e Mulberry Street da Library of Congress. La seconda è una scelta d’identità per Sociologia: non viene presentata come fonte o illustrazione di una tesi degli appunti. Non ho caricato né pubblicato materiali dei libri.

### Movimento: pochi gesti riconoscibili

| Momento | Proposta | Durata indicativa |
| --- | --- | --- |
| Cambio di vista | Un passaggio breve dell’intera vista, senza animare ogni riga | 180–240 ms |
| Selezione nell’emiciclo | Il gruppo scelto resta leggibile; gli altri si attenuano; nome e link si aggiornano | 140–180 ms |
| Apertura delle impostazioni | Espansione coerente con il controllo usato, senza spostamenti inattesi | 180–220 ms |
| Passaggio su un’immagine | Piccolo avvicinamento dell’immagine dentro il suo ritaglio | 300–400 ms |
| Nuovo esame superato | Si aggiornano soltanto i seggi relativi all’esame | 350–500 ms |

L’ultimo effetto appartiene all’integrazione futura con i voti: non è simulato come dato reale nella prova. Il prototipo contiene transizione di vista, interazione con l’emiciclo, immagini, dialoghi e cambio tema. Con movimento ridotto le animazioni non essenziali sono disabilitate. Niente parallasse, cursori personalizzati, scroll controllato o effetti ripetuti su ogni card.

## Pagina per pagina

**Oggi.** Data e contesto del semestre in una testata corta. Una sola attività consigliata, con verbo esplicito: “Allena questo argomento”. Emiciclo preservato; riepilogo di laurea più quieto; materie con appunti visivamente riconoscibili sotto. Lo stato dell’agente rimane disponibile senza diventare un allarme permanente. Notifiche e tema non occupano un grande footer operativo in ogni schermata.

```text
Uni        Oggi  Materie  Percorso  Libretto           Cerca  Tema

Mercoledì 11 novembre                              I anno

┌────────────────────────────┐   Da allenare in Diritto pubblico
│ La tua laurea              │   Gli organi dell’Unione europea
│                            │   Durata e spiegazione breve
│       EMICICLO              │   [Allena questo argomento]
│                            │
│ 0 CFU    4 esami in corso   │   Ripasso di oggi      [Ripassa]
└────────────────────────────┘

I tuoi appunti                                  Tutte le materie
[foto Montecitorio] Diritto pubblico    [foto urbana] Sociologia
```

**Materie.** Le due materie con appunti hanno immagini sufficientemente grandi e una gerarchia chiara. Quelle senza materiali restano una lista compatta, senza inventare copertine vuote o progressi. Anni futuri espandibili o filtrabili; non una pagina infinita di voci equivalenti.

**Materia.** Titolo breve per orientarsi e nome ufficiale conservato nel contesto appropriato. Subito disponibili appunti e avvio della simulazione. Su mobile, impostazioni inizialmente chiuse. Capitoli e argomenti davanti alla diagnostica tecnica del kit. L’emiciclo della padronanza resta disponibile, con riepilogo compatto ed espansione, senza imporre la sua massima dimensione ad ogni visita. L’anteprima mostra l’ordine di lettura proposto; non sostituisce tutte le funzioni della scheda reale.

**Percorso.** Anno corrente aperto, altri anni richiudibili. Semestri come veri gruppi temporali, esami sostenuti distinti senza ripetere badge sulle righe future. Il passaggio anno/semestre deve essere leggibile anche in scuro e da tastiera.

**Libretto.** Riepilogo compatto; registrazione del voto come azione esplicita. Primo anno in evidenza, anni successivi richiudibili. Nello stato senza voti una frase utile al posto di una sequenza di trattini e numeri vuoti. Nessun dato o voto inventato per rendere “piena” la pagina.

**Ricerca.** Accesso permanente da pulsante e scorciatoia. Su desktop si può usare un dialogo; su mobile una superficie più ampia. Risultati con nome della materia, titolo e breve contesto. Conservare la pagina `/cerca`, l’indice Pagefind e gli URL condivisibili: il dialogo è un accesso aggiuntivo, non un nuovo motore.

**Lettore, ripasso e simulazione.** Sono superfici di concentrazione. Tipografia leggibile, una colonna di lettura e controlli essenziali; nessuna fotografia fra domanda e risposta. Non ho avviato simulazioni reali né modificato risposte o voti durante l’analisi. La loro revisione completa richiederà schermate di sessioni esistenti e controllo degli stati di attesa/correzione.

## Riferimenti studiati e loro uso

Queste sono fonti e riferimenti, non istruzioni per copiare un sito.

| Fonte | Che cosa considero utile qui |
| --- | --- |
| [Frontend Design, Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), anche nella skill locale | Identità dal soggetto, gerarchie intenzionali, critica dei trattamenti ripetuti. L’emiciclo è il punto di partenza pertinente. |
| [Impeccable, sorgente della skill](https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md) | Distinzione fra superfici per operare, leggere e presentare. La home di studio non deve diventare una landing page. Consultata come ricerca; nessun runtime o pacchetto installato. |
| [Linear: How we redesigned the UI](https://linear.app/now/how-we-redesigned-the-linear-ui) | Riduzione del rumore della struttura, allineamenti e densità della navigazione. Non propongo di importarne la palette o l’aspetto SaaS. |
| [It’s Nice That](https://www.itsnicethat.com/) | Immagini trattate come contenuto e differenze di scala fra elementi. Da tradurre nella biblioteca delle materie. |
| [Rauno, Craft](https://rauno.me/craft) | Cura delle interazioni, selezione, dialoghi e continuità fra stati. Non tutti gli esperimenti sono adatti a uno strumento di studio. |
| [Are.na, Interface](https://www.are.na/editorial/interface) | Riferimenti a interfacce per organizzare conoscenza; utile come confronto di sobrietà, insufficiente da solo per la richiesta di maggiore ricchezza visiva. |
| [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) | Semantica dei controlli, focus, immagini con dimensioni, gestione del movimento e coerenza della navigazione. |
| [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | Implementazione del rispetto della preferenza di movimento. |

## Prova visiva e limiti

Aprire [anteprima/index.html](anteprima/index.html) in un browser. Funziona da file locale, senza installazioni né server. Offre Oggi, Materie e due schede di materia; ricerca locale dimostrativa, dialoghi, selezione dei gruppi dell’emiciclo e tema persistente. I collegamenti a percorso, libretto e documenti aprono il portale attuale, dove rimane necessario il normale accesso Cloudflare. La prova non contiene credenziali.

Le schermate dell’anteprima sono nella stessa cartella. I contenuti dimostrativi sono dichiarati nel footer; le azioni di allenamento aprono una spiegazione, non una sessione reale. Il diagramma della laurea riusa l’SVG della cattura del sito: è un’istantanea, non un collegamento ai dati di produzione.

La prova mantiene Titillium, cambia pesi e composizione, introduce fotografie e riduce la navigazione: consente di valutare questa direzione prima di modificare tutte le pagine Astro. Non è un redesign completo già integrato o pubblicato.

Verifica dell’anteprima con Chrome: **18 combinazioni** (Oggi, Materie, Sociologia × 320/390/1440 px × chiaro/scuro), nessun overflow, immagine mancante o errore JavaScript; **12 controlli d’interazione** superati su ricerca, Escape, navigazione, dialogo e persistenza del tema. Movimento ridotto attivo durante i controlli. Screenshot rivisti visivamente, inclusi home desktop e home mobile in scuro. Sintassi JavaScript e `git diff --check` regolari. Questi controlli non equivalgono a un audit completo di accessibilità; il progetto Astro non è stato ricostruito perché non sono stati modificati i suoi sorgenti.

## Ordine di realizzazione

1. **Navigazione e composizione della home.** Token, `Nav.astro`, `Base.astro`, `index.astro`; confronto a 390 e 1440 px. È il cambiamento con più impatto immediato.
2. **Identità delle materie.** Gestione degli asset e dei crediti, catalogo e testata materia, senza alterare il contenuto degli appunti.
3. **Gerarchia della scheda materia.** Capitoli accessibili prima, impostazioni raccolte, riepilogo padronanza compatto; conservare endpoint, dati e flussi.
4. **Percorso, libretto, ricerca e superfici di concentrazione.** Un linguaggio coerente, strutture appropriate ai diversi compiti.
5. **Movimento e rifinitura.** Seggi, selezioni, transizioni e conferme; poi verifica su dispositivo e produzione.

Criteri per considerare pronto il lavoro: azione principale visibile senza scroll su un telefono 390 × 844; nessun overflow a 320 px e con testo ingrandito; navigazione comprensibile da tastiera; immagini locali con dimensioni e crediti; chiaro/scuro completi; preferenza di movimento rispettata; nessun cambiamento ai calcoli di CFU, padronanza, FSRS e voti. Per l’integrazione Astro serviranno i controlli di progetto e verifica dei flussi reali, non soltanto screenshot.

**Stato del cantiere:** ricerca e anteprima locale completate; integrazione e pubblicazione da eseguire. La board esterna non è stata aggiornata: ArtifactData non è disponibile nella sessione, non risultano documenti collegati e l’URL della board non è leggibile dal browser web disponibile. Questo stato è registrato qui senza dichiarare aggiornamenti non avvenuti.
