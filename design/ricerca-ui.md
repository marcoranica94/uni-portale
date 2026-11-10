# Ricerca UI — redesign del portale di studio (novembre 2026)

Note di metodo
- **Letto per intero (testo grezzo scaricato):** skill `frontend-design` di Anthropic, Vercel Web Interface Guidelines, skill `ui-ux-pro-max` (SKILL.md, quick-reference, pro-rules, typography.csv), skill `impeccable` (SKILL.md, craft-floor, mode-operate, colorize, typeset, layout), Apple HIG (Dark Mode, Color, Typography, Accessibility tramite l'endpoint JSON ufficiale), Material 3 (documentazione su GitHub: Color.md, BottomNavigation.md), WCAG 2.2 Understanding (testo dei criteri).
- **Letto tramite estrattore automatico (WebFetch: contenuto fedele ma riassunto):** Radix Colors, Vercel Geist Colors, Linear (2 articoli), OpenAI "Designing delightful frontends with GPT-5.4", NN/g (2 articoli), Duolingo blog (2 articoli), Refactoring UI (anteprima ufficiale + riassunto di terzi), Butterick, MDN.
- **Non leggibile:** Medium "7 Practical Tips for Cheating at Design" (HTTP 403); m3.material.io e Google Fonts Knowledge (pagine solo JavaScript, nessun testo estraibile). Per M3 ho usato la documentazione ufficiale su GitHub; per Google Fonts ho verificato direttamente i file dei font.
- Le regole sotto ogni fonte sono **della fonte**. Le mie deduzioni compaiono solo nelle sezioni finali o sono marcate "→ per il portale".

Stato attuale rilevato nel codice (`piattaforma/src/styles/tokens.css`): già in uso Source Serif 4 + Source Sans 3 variabili, scala 13/14/16/18/22/28/36 px.

---

## 1. Skill per agenti AI dedicate al design

### 1.1 Anthropic — skill `frontend-design`
URL: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md (versione corrente su `main`, letta il 10/11/2026)

Regole concrete:
- Prima di progettare, identificare **soggetto, pubblico e compito principale** della pagina; le scelte visive nascono dal mondo del soggetto.
- Una o due famiglie tipografiche; se due, **chiaramente distinte**. Scala tipografica esplicita (rif. *The Elements of Typographic Style*), pesi e spaziature intenzionali.
- Righe **< 80 caratteri**; il serif può essere un po' più lungo e vuole **interlinea leggermente maggiore** del sans.
- Evitare: una sola parola del titolo evidenziata (corsivo/grassetto/colore); **etichette tutte maiuscole**; etichette tipografiche superflue sopra i contenuti.
- "La struttura visiva è informazione": bordi, numerazioni, divisori, etichette devono codificare qualcosa. Numeri 01/02/03 **solo se il contenuto è davvero una sequenza** (per il portale: il Percorso per semestri lo è).
- Movimento non richiesto dall'utente: raro, un solo momento orchestrato. Animazioni di ingresso su ogni sezione e hover su ogni card "sembrano generate da AI". Benvenuto il movimento che risponde a un'azione (aprire, espandere, confermare).
- Cliché da non usare come default: (1) sfondo crema ~#F4F1EA + serif ad alto contrasto + accento terracotta ~#D97757; (2) quasi-nero con un solo accento acido; (3) layout "broadsheet" con filetti sottili e raggio zero; (4) **kit SaaS: card identiche arrotondate, stesso raggio ovunque, stessa ombra grigia rgba(0,0,0,.1), sfumature decorative**; (5) "cromatura" da template: eyebrow MAIUSCOLO spaziato sopra ogni titolo, meta con puntini "A · B · C", etichette "PAROLA — frammento", quasi-nero tinto (#0B0B0B, #111), monospace per piccole etichette dati, "→" in coda a link e bottoni.
- Processo: piano compatto (4–6 colori esadecimali con nome, ruoli tipografici, wireframe ASCII, allineamento), revisione del piano contro il brief, poi codice; attenzione alle **specificità CSS che si annullano** (es. `.section` vs `.cta` sui margini).
- "Spendi l'audacia in un solo punto"; soglia minima di qualità: responsive fino a mobile, focus da tastiera visibile, `prefers-reduced-motion`, accessibilità. Togliere un accessorio prima di uscire (Chanel).
- Testi: dal punto di vista dell'utente, voce attiva; il bottone dice esattamente cosa fa ("Salva modifiche", non "Invia"); **un'azione mantiene lo stesso nome in tutto il flusso**; errori che dicono cosa è successo e come rimediare, senza scuse; **lo stato vuoto è un invito ad agire**; sentence case.

### 1.2 Vercel — Web Interface Guidelines
URL: https://github.com/vercel-labs/web-interface-guidelines (README; skill installabile `web-design-guidelines` da vercel-labs/agent-skills). Documento "vivente", senza data.

Regole concrete rilevanti:
- **Target**: area cliccabile = area visiva; se il visivo è < 24 px, estendere l'area a ≥ 24 px; **su mobile minimo 44 px**.
- Input con `font-size` ≥ 16 px su mobile (evita lo zoom di iOS Safari). Mai disabilitare lo zoom.
- `touch-action: manipulation` sui controlli; `-webkit-tap-highlight-color` coerente col design.
- Focus visibile e non coperto, `:focus-visible`; header/footer sticky non devono coprire l'elemento a fuoco.
- **Link sono `<a>`** (mai `<button>`/`<div>` per navigare); stato nell'URL (filtri, tab, pannelli aperti) per condividere/ricaricare/tornare indietro; ripristino della posizione di scroll.
- Caricamenti: indicatore + etichetta originale; spinner/skeleton con ritardo 150–300 ms e durata minima 300–500 ms; **skeleton identici al contenuto finale**.
- Ogni schermata offre un passo successivo ("No dead ends"); **progettare tutti gli stati: vuoto, scarso, denso, errore**.
- `font-variant-numeric: tabular-nums` per i confronti numerici; formati di data/numero secondo la locale; numero e unità separati da spazio non separabile (`10&nbsp;MB`); virgolette tipografiche; carattere "…".
- Stato mai affidato al solo colore; icone con etichetta; `aria-label` per bottoni solo-icona; nativi prima di ARIA; gerarchia h1–h6 e skip link.
- Animazioni: `prefers-reduced-motion`; solo `transform`/`opacity`; **mai `transition: all`**; animare solo se chiarisce causa-effetto.
- Layout: allineamento deliberato a griglia/linea di base; `env(safe-area-inset-*)`; raggio del figlio ≤ raggio del genitore e concentrico.
- Design: **ombre a due livelli** (ambientale + diretta); **bordi + ombre insieme per bordi nitidi, bordi semitrasparenti**; su sfondi non neutri, tingere bordi/ombre/testo verso la stessa tinta; preferire **APCA** a WCAG 2 per il contrasto percepito; **hover/active/focus con più contrasto** dello stato di riposo; `<meta name="theme-color">` uguale allo sfondo; `color-scheme: dark` su `<html>` nel tema scuro; su `<select>` nativi impostare esplicitamente `background-color` e `color`.
- Testi (sezione "Vercel-specific", non universale): voce attiva, etichette specifiche ("Salva chiave API" e non "Continua"), errori che indicano l'uscita, numeri in cifre ("8 esami").

### 1.3 `ui-ux-pro-max` (nextlevelbuilder)
URL: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill — SKILL.md, `references/quick-reference.md`, `references/pro-rules.md`, `data/typography.csv` (letti il 10/11/2026). È soprattutto un catalogo ricercabile (stili, palette, 74 abbinamenti di font, 120 linee guida UX) con script Python; utile come checklist, meno come direzione estetica.

Priorità dichiarate (1 = più importante): Accessibilità → Touch → Prestazioni → Scelta dello stile → Layout responsive → Tipografia e colore → Animazione → Form → Navigazione → Grafici.

Regole concrete:
- Contrasto testo ≥ 4.5:1 (grande 3:1); **anche il testo secondario ≥ 4.5:1 in entrambi i temi**; icone significative e bordi dei controlli ≥ 3:1.
- Target ≥ 44×44 pt (Apple) / 48×48 dp (Material), **≥ 8 px tra target**; feedback di pressione entro 80–150 ms; niente funzioni solo-hover.
- Corpo **≥ 16 px su mobile**, interlinea 1.5–1.75; scala coerente (es. 12 14 16 18 24 32); pesi: titoli 600–700, corpo 400, etichette 500.
- **Token semantici** (primary, surface, on-surface, error…), mai esadecimali nei componenti.
- Spaziatura su griglia 4/8 px; breakpoint sistematici (375/768/1024/1440).
- Navigazione: **barra inferiore ≤ 5 voci, sempre icona + testo**; posizione corrente evidenziata; navigazione nella stessa posizione su tutte le pagine; non mescolare tab + sidebar + bottom nav allo stesso livello; ≥ 1024 px sidebar, schermi piccoli barra in basso/alto; tornare indietro ripristina scroll e filtri; azioni pericolose separate.
- Cifre **tabellari** per colonne di dati, prezzi, timer.
- Stati vuoti con messaggio e azione; flussi multi-step con indicatore di avanzamento.
- Tema chiaro (pro-rules): "card/superfici **chiaramente separate** dallo sfondo con opacità/elevazione sufficiente"; "evitare testo grigio a basso contrasto"; **divisori visibili in entrambi i temi**; stati premuto/focus/disabilitato distinguibili in entrambi i temi; **progettare chiaro e scuro insieme**, il scuro con varianti desaturate, non invertite.
- Icone: **niente emoji come icone**; un'unica famiglia SVG, uno stile (pieno o contorno) per livello gerarchico, dimensioni come token.
- Scala di elevazione coerente; niente valori d'ombra casuali.
- Abbinamenti di font pertinenti dal catalogo: "Academic/Research" Crimson Pro + Atkinson Hyperlegible; "News Editorial" Newsreader + Roboto; "Minimal Swiss" Inter + Inter per dashboard.

### 1.4 `impeccable` (Paul Bakaus) — v4.8.2
URL: https://github.com/pbakaus/impeccable (`.agents/skills/impeccable/`), sito impeccable.style. Nasce come estensione della skill Anthropic; versione letta 4.8.2.

Regole concrete:
- **Modalità della superficie**: il portale è "Operate" (dashboard, strumenti: il visitatore completa un compito) e, per gli appunti, "Read". In Operate "scansionabilità, coerenza, aspettative native e scena d'uso reale vengono prima dell'espressione; il brand vive nei dettagli precisi". Il "mondo" visivo presta solo **tipografia, palette, densità e una mossa distintiva**; mai la navigazione o i controlli, che restano standard.
- Operate: "**uno schermo grigio con un solo colore d'accento è il default della categoria senza la sua cura, non sobrietà**": usare il colore per lavori reali (guscio/barra colorata o fondo tinto, colori di stato, selezione, serie di dati).
- Redesign: il vecchio aspetto è "prova e anti-riferimento"; non fare "polish" su un look scartato.
- Craft floor (verifiche): testo e placeholder ≥ 4.5:1; **su superfici colorate il testo secondario si tinge dalla tinta della superficie, mai grigio**; ombre con offset e sfocatura (alone colorato a offset zero = decorazione); **gruppi stretti, separazione generosa, più spazio sopra un titolo che sotto**; misura del corpo 65–75 ch; tracking mai sotto −0,04 em; stati hover/disabled/loading/errore/vuoto; **tematizzare anche le superfici del browser** (selezione testo, caret, scrollbar, anelli di focus, offset della sottolineatura, cifre tabellari).
- Da rifiutare: card identiche icona+titolo+testo come struttura; **card annidate (sempre sbagliate)**; template "numero grande + etichetta piccola + statistiche"; **eyebrow sopra i titoli (divieto assoluto)**; numeri di sezione senza vera sequenza; modali non necessari; testo in gradiente; vetro/blur decorativi; **bordo colorato laterale > 1 px su card, voci di lista, avvisi**; ombre dure a offset; sparkline/anelli di progresso come riempitivo; monospace come "costume tecnico"; emoji o glifi Unicode al posto di icone; **chiaro o scuro scelto per categoria anziché per scena d'uso**.
- "Dichiara l'elevazione una volta sola: bordo **oppure** ombra. Un bordo 1 px sotto un'ombra ampia e morbida è la *ghost card*." Raggi delle card 12–16 px; le pillole solo per piccoli controlli. (Nota: contraddice in parte Vercel, che consiglia bordo + ombra; vedi sintesi.)
- Colore (colorize): costruire **ruoli** (canvas e superfici elevate, testo primario/secondario, azione/focus/selezione, bordi, stati, dati), non un mucchio di campioni; in Operate il colore codifica azione, selezione, stato, orientamento: "la rarità dà forza all'accento"; per palette web nuove preferire **OKLCH**, ridurre la croma vicino a bianco e nero; preferire colori espliciti a catene di trasparenze (contrasto dipendente dal contesto); tema scuro composto, non invertito; contrasti: corpo 4.5:1, grande 3:1, controlli/icone/focus 3:1.
- Tipografia (typeset): in Operate/Read "spesso basta una sola famiglia ben regolata con scala a ruoli fissi"; corpo **1 rem / 16 px**; prosa 45–75 ch; interlinea inversa alla misura; testo chiaro su scuro: un po' più di interlinea, tracking e peso; `text-wrap: balance` sui titoli, `text-wrap: pretty` sul corpo; caricare solo i pesi usati, fallback metricamente compatibili; ritmo dei paragrafi con spazio **oppure** rientro, non entrambi.
- Layout: **squint test** (sfocando, si distinguono ancora elemento primario, secondario e gruppi?); raggruppare per prossimità prima di aggiungere contenitori; ritmo con alternanza di intervalli stretti e ampi; scala di spaziatura a base 4; `gap` per i fratelli; profondità solo se chiarisce stato o gerarchia.

### 1.5 OpenAI — "Designing delightful frontends with GPT-5.4"
URL: https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4 — data non indicata nella pagina; articoli che lo citano sono di marzo 2026.

Regole concrete (sezione "App and Dashboard UI" e generali):
- App/dashboard: "**sobrietà stile Linear**: gerarchia calma delle superfici, pochi colori, cromatura minima, informazione densa ma leggibile"; organizzare attorno a uno **spazio di lavoro principale**, navigazione, contesto secondario e **un accento**.
- Evitare: mosaici di card, **bordi spessi su ogni regione**, gradienti decorativi dietro la UI di routine, hero nelle app, "UI fatta di card impilate".
- Card **solo quando sono il contenitore di un'interazione**: "se togliere bordo, ombra, sfondo o raggio non danneggia interazione o comprensione, togli la card".
- Massimo due famiglie, scala con ruoli (display, headline, body, caption); un accento di default; evitare il viola su bianco e il "bias" per il tema scuro.
- Testi di servizio ("Ultima sincronizzazione"), non di marketing; "se togliere il 30% del testo migliora la pagina, continua a togliere".
- Vincoli dichiarati in anticipo (un H1, due famiglie, un accento, una CTA primaria).

---

## 2. Linee guida consolidate

### 2.1 Refactoring UI (Wathan & Schoger)
- Sito/anteprime: https://www.refactoringui.com/ e https://www.refactoringui.com/previews/building-your-color-palette (lette). Libro a pagamento; articolo Medium ufficiale **non leggibile (403)**. Regole aggiuntive da riassunto di terzi (https://dev.to/updivision/book-review-refactoring-ui-by-adam-wathan-steve-schoger-2f7m): attendibilità secondaria.

Dalla fonte ufficiale:
- "**Usa meno bordi**": troppi rendono il design affollato; in alternativa **ombra, sfondi di colore contrastante o più spazio**.
- Palette: **8–10 grigi**; 1–2 colori primari con 5–10 tonalità; accenti fino a ~10 colori con 5–10 tonalità, usati con parsimonia; tonalità **definite in anticipo**, non generate con lighten/darken al volo; scegliere prima la base (quella che funziona come sfondo di un bottone), poi la più scura (testo) e la più chiara (sfondi tinti, es. in un avviso), poi riempire; il grigio più scuro = testo più scuro del progetto (non nero puro), il più chiaro = fondo appena off-white.
- Indice del capitolo "Hierarchy is Everything" (titoli ufficiali): *De-emphasize to emphasize*, *Labels are a last resort*, *Separate visual hierarchy from document hierarchy*, *Don't use grey text on colored backgrounds*.

Dal riassunto di terzi (dev.to):
- Spaziatura costruita da base 16 px; "più spazio di quanto pensi, poi riduci"; spazio etichetta→campo minore di quello tra gruppi.
- Scala tipografica: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72 px.
- **Numeri allineati a destra nelle tabelle**; paragrafi 45–75 caratteri; interlinea cresce con la lunghezza della riga e cala con la dimensione (titoli grandi ~1).
- **Grigi leggermente tinti** (verso il blu = freddi, verso il giallo/arancio = caldi), con più saturazione agli estremi chiaro e scuro.
- Ombre: piccole e strette per bottoni, grandi e sfocate per modali; **sistema a due ombre** (una ampia e morbida + una piccola e più scura sotto l'elemento).
- Gerarchia: dimensione, peso, colore/contrasto; **un bottone primario per schermata**, pochi secondari; azioni distruttive non primarie.
- Concetto (riportato da più sintesi, non verificato sul libro): il grigio funziona su bianco perché riduce il contrasto, ma **su fondi colorati appare sporco: usare la stessa tinta dello sfondo** con saturazione/luminosità diverse; etichette "Etichetta: valore" come ultima risorsa ("12 rimasti" invece di "Disponibili: 12").

### 2.2 Apple Human Interface Guidelines
URL: https://developer.apple.com/design/human-interface-guidelines/ (Dark Mode, Color, Typography, Accessibility; lette via JSON ufficiale; Dark Mode modificata il 6/8/2024).

- **Non offrire un'impostazione d'aspetto propria dell'app**: rispettare quella di sistema (→ per il portale: seguire `prefers-color-scheme`; un interruttore manuale è al più secondario).
- L'app deve stare bene in entrambi i temi; i colori scuri **non sono inversioni** di quelli chiari.
- Contrasto **minimo 4.5:1**; per colori personalizzati **puntare a 7:1, soprattutto nel testo piccolo**.
- Testare i colori in condizioni di luce diverse: **in ambienti luminosi i colori appaiono più scuri e smorzati** (→ uso da telefono all'aperto: accento e testo secondario non devono essere tenui).
- Non usare lo stesso colore per significati diversi (es. il colore del brand per "interattivo" e anche per testo non interattivo).
- Etichette a 4 livelli (primary, secondary, tertiary, quaternary label); sfondi a livelli (system, secondary, tertiary). In iOS scuro: sfondi **base** (più scuri, arretrano) ed **elevated** (più chiari, avanzano).
- Tipografia: iOS corpo predefinito **17 pt, minimo 11 pt**; evitare pesi Ultralight/Thin/Light; usare peso, dimensione e colore per la gerarchia; **ridurre il numero di caratteri tipografici**; supportare l'ingrandimento del testo fino al 200%.
- Controlli **44×44 pt** minimo; spaziatura tra controlli importante quanto la dimensione: ~12 pt attorno a elementi con contorno, ~24 pt attorno a elementi senza.

### 2.3 Material Design 3
URL: https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md e .../docs/components/BottomNavigation.md (m3.material.io non leggibile: solo JS).

- **Superfici tonali al posto delle ombre**: M3 ha sostituito gli "elevation overlay" con ruoli tonali. Tema chiaro (toni della palette neutra): `surface` N98, `surfaceContainerLowest` **bianco**, `surfaceContainerLow` N96, `surfaceContainer` N94, `surfaceContainerHigh` N92, `surfaceContainerHighest` N90, `surfaceDim` N87. Tema scuro: surface N6, lowest N4, low N10, container N12, high N17, highest N22, bright N24.
- Testo: `onSurface` N10 (chiaro) / N90 (scuro); **testo secondario `onSurfaceVariant` = neutral-variant 30** in chiaro (cioè scuro, non grigio chiaro) e NV80 in scuro.
- Bordi: `outline` NV50 (chiaro) per bordi significativi, `outlineVariant` NV80 per divisori decorativi.
- Contenitori d'accento: `primaryContainer` tono 90 con testo `onPrimaryContainer` tono 10 (chiaro); in scuro 30/90. Stesso schema per error container.
- Barra di navigazione: **da 3 a 5 destinazioni**, in basso, ciascuna con **icona + etichetta**.
- → Per il portale: la logica "fondo leggermente grigio (≈N96–98) + card bianche (lowest) + testo secondario scuro (≈tono 30)" è il modo M3 di evitare il chiaro piatto.

### 2.4 WCAG 2.2 (W3C, Raccomandazione 2023; testo dei criteri letto)
- **1.4.3 Contrasto minimo (AA)**: testo ≥ **4.5:1**; testo grande ≥ 3:1; esenti componenti inattivi, decorazioni, loghi.
- **1.4.11 Contrasto non testuale (AA)**: componenti UI (bordi di campi, stati, anelli di focus) e parti grafiche necessarie ≥ **3:1** con i colori adiacenti. (→ un bordo di card puramente decorativo non è vincolato; un bordo che identifica un controllo sì.)
- **1.4.1 Uso del colore (A)**: il colore non è mai l'unico mezzo per trasmettere informazione.
- **2.5.8 Dimensione minima del target (AA, nuovo in 2.2)**: ≥ **24×24 px CSS**, o spaziatura tale che cerchi di 24 px non si sovrappongano; eccezioni per link nel testo.
- **2.4.11 Focus non oscurato (AA, nuovo in 2.2)**: il componente a fuoco non è interamente nascosto da contenuti dell'autore (header/barra inferiore sticky).

### 2.5 Riferimenti di qualità: Linear, Duolingo, NN/g
**Linear — "How we redesigned the Linear UI (part II)"**, 28/3/2024, https://linear.app/now/how-we-redesigned-the-linear-ui
- Temi generati in **LCH** (percettivamente uniforme) da **tre input: colore di base, accento, contrasto** (al posto di 98 variabili); la variabile di contrasto genera temi ad altissimo contrasto per accessibilità; LCH gestisce anche l'elevazione delle superfici (sfondo, pannelli, dialoghi).
- **Testo e icone neutre più scuri nel tema chiaro** (e più chiari nello scuro) per aumentare il contrasto dei contenuti; limitata la componente blu per un aspetto più neutro.
- Inter Display per i titoli, Inter per il resto.

**Linear — "A calmer interface for a product in motion"**, 12/3/2026, https://linear.app/now/behind-the-latest-design-refresh
- "Non competere per un'attenzione che non ti sei guadagnato": **la sidebar di navigazione è attenuata di alcuni gradini** perché l'area di lavoro emerga.
- Meno icone, più piccole; rimossi sfondi colorati decorativi delle icone.
- **Divisori meno numerosi e più tenui**: "la struttura si deve sentire, non vedere".
- Grigi passati da freddi/bluastri a **grigio più caldo e meno saturo**, ma con limite: troppo calore rende l'interfaccia "fangosa".

**Duolingo — nuovo home screen**, annunciato 6/5/2022, https://blog.duolingo.com/new-duolingo-home-screen-design
- Un **percorso lineare unico**: il discente segue il passo successivo invece di scegliere tra abilità; livelli completati diventano dorati e restano rivisitabili; **freccia flottante che riporta alla posizione corrente**; ripasso (spaced repetition) **intercalato nel percorso**, non in una sezione separata; progresso = posizione nel percorso.

**Duolingo — "Elevating craft: How we refreshed our core tabs"**, 4/2/2026, https://blog.duolingo.com/core-tabs-redesign
- **Spazio bianco al posto dei contenitori**: sezioni separate da spaziatura, non da box; titoli in posizione fissa, allineati a sinistra, dimensione per livelli secondo lo scopo della tab; sistema tipografico con il minimo di stili; illustrazioni decorative nei titoli rimosse se non segnalano nulla; "la coerenza deve servire a qualcosa".

**NN/g — "Mobile Tables"** (Amy Schade, 17/9/2017), https://www.nngroup.com/articles/mobile-tables/
- Progettare prima la tabella grande, poi adattare scegliendo gli attributi che contano; colonne leggibili senza zoom (testi lunghi: forse solo 2 colonne; numeri: di più); rotazione dello schermo solo come ultima risorsa; **intestazioni fisse**; scorrimento orizzontale segnalato (colonna tagliata/frecce); **prima colonna bloccata**; lasciare scegliere righe/colonne; raggruppare attributi in fisarmoniche.

**NN/g — "Data Tables: Four Major User Tasks"** (Page Laubheimer, 3/4/2022), https://www.nngroup.com/articles/data-tables/
- Intestazioni e prima colonna fisse; aiuti a seguire la riga (bordi, zebratura, evidenziazione); prima colonna = nome leggibile (nome dell'esame, non un codice); colonne più importanti per prime; filtri visibili con indicatore di filtro attivo.

Anki e Notion: non ho trovato fonti ufficiali di design consultabili con regole esplicite; non li uso come fonte.

---

## 3. Tema chiaro: come non farlo piatto e slavato

Fonti dirette:
- **Radix Colors — Understanding the scale**, https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale. Scala a 12 gradini con usi fissi: 1 sfondo app; 2 sfondi tenui (card, sidebar, tabelle zebrate); 3 fondo normale dei componenti; 4 hover; 5 premuto/selezionato; **6 bordi tenui di elementi non interattivi** (card, header, separatori); **7 bordi di elementi interattivi**; **8 bordi forti e anelli di focus**; 9 colore pieno (bottoni, accenti); 10 hover del pieno; **11 testo a basso contrasto (garantito APCA Lc 60 sul gradino 2)**; **12 testo ad alto contrasto (Lc 90)**. In chiaro il bianco può fare da sfondo dell'app.
- **Vercel Geist — Colors**, https://vercel.com/geist/colors. Due sfondi: `background-100` predefinito, `background-200` "con parsimonia" per una differenziazione tenue; grigi 1–3 fondi dei componenti (normale/hover/attivo), **4–6 bordi (normale/hover/attivo)**, 7–8 fondi ad alto contrasto, **9 testo secondario e icone, 10 testo primario**. Bordo grigio pieno di default; variante alpha solo se il bordo deve fondersi.
- **Material 3** (sopra): fondo N98, card bianche, contenitori N94–N90; testo secondario a tono 30 (scuro); `outlineVariant` per divisori.
- **Apple**: in luce intensa i colori appaiono più scuri e smorzati; contrasto ≥ 4.5:1, mirare a 7:1 per testo piccolo personalizzato.
- **Linear 2024**: testo e icone neutre resi più scuri in chiaro; **Linear 2026**: divisori più tenui ma grigio caldo controllato.
- **Refactoring UI**: meno bordi; separare con ombra, fondo contrastante o spazio; grigi leggermente tinti; sistema a due ombre.
- **Vercel Guidelines**: ombre a due livelli; bordi semitrasparenti + ombra per contorni nitidi; hover/focus con più contrasto.
- **impeccable**: un solo meccanismo di elevazione (bordo o ombra); niente "ghost card"; uno schermo grigio + un accento non è sobrietà; testo secondario mai grigio generico su superfici colorate.

→ Sintesi operativa per il portale (mia, derivata dalle fonti sopra):
1. **Tre livelli di superficie distinguibili**: fondo pagina leggermente scuro e tinto (ordine di grandezza M3 N96–98, es. un grigio-blu freddo appena percettibile, coerente con l'accento inchiostro), card **bianche**, zone incassate (input, righe alternate) un gradino sotto il fondo. Il chiaro piatto nasce quasi sempre da "card bianche su fondo bianco con bordo grigio chiarissimo".
2. **Elevazione**: scegliere una regola e rispettarla. Proposta: card = fondo bianco su fondo tinto + bordo semitrasparente 1 px (Radix gradino 6 / Geist gray-400) **senza** ombra ampia; ombra a due livelli solo per elementi davvero sopraelevati (menu, foglio inferiore, barra di navigazione). Così si rispettano sia Vercel (bordo+ombra nitidi dove c'è ombra) sia impeccable (niente ghost card).
3. **Testo**: primario quasi nero tinto verso l'accento (gradino 12, contrasto ≥ 12:1); **secondario scuro** (gradino 11 / tono 30; ≥ 4.5:1 e, sul telefono all'aperto, meglio ≥ 7:1); il terziario solo per metadati non essenziali, mai sotto 4.5:1 se è testo da leggere.
4. **Bordi**: 3 intensità con ruoli (decorativo, controllo, focus). I bordi che identificano controlli (campi, bottoni secondari) ≥ 3:1 (WCAG 1.4.11); i divisori decorativi possono essere tenui ma devono restare visibili.
5. **Accento su chiaro**: blu inchiostro **scuro e saturo** (per testo/link ≥ 4.5:1 su bianco e sul fondo tinto; per bottone pieno con testo bianco ≥ 4.5:1); usare il gradino chiaro della stessa tinta (tono ~90–95) per fondi "selezionato/oggi/attivo" invece di aumentare i grigi. Colore = azione, selezione, stato; non decorazione.
6. **Colore con lavoro vero** (impeccable/Operate): colori semantici per esito/stato (superato, da sostenere, in scadenza) sempre con testo o icona; un'area con identità (es. barra superiore o indicatore della scheda corrente) per non avere "grigio + un accento".
7. Definire i token in **OKLCH**, chiaro e scuro progettati insieme, mai per inversione.

---

## 4. Tipografia web 2026 per un'interfaccia in italiano

Fonti: Anthropic frontend-design (1–2 famiglie distinte, scala esplicita, serif con interlinea maggiore); impeccable typeset (16 px, 45–75 ch, `text-wrap`); Apple (17 pt corpo iOS, niente pesi sottili, poche famiglie); OpenAI (max 2 famiglie, ruoli display/headline/body/caption; evitare default come Inter/Roboto/Arial/system); ui-ux-pro-max (pesi 600–700/400/500, interlinea 1.5–1.75); Refactoring UI via terzi (scala 12…72); Butterick, *Practical Typography — Summary of key rules*, https://practicaltypography.com/summary-of-key-rules.html: corpo web **15–25 px**, interlinea **120–145%**, riga **45–90 caratteri**, maiuscolo solo per meno di una riga e con **5–12% di spaziatura**, grassetto/corsivo il meno possibile e mai insieme, rientro **o** spazio tra paragrafi; MDN `font-variant-numeric`, https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric: `tabular-nums` (OpenType `tnum`) allinea le cifre in colonna, `lining-nums` (`lnum`) cifre di altezza uniforme, `oldstyle-nums` (`onum`) cifre con discendenti; **funzionano solo se il font contiene la funzione**.

Verifica diretta delle funzioni OpenType sui file di Google Fonts (google/fonts, ricerca grezza dei tag nel file, 10/11/2026; l'assenza di `tnum` può significare che le cifre predefinite sono già tabellari, come avviene di norma nei font Adobe):

| Font | tnum | lnum | onum | pnum | Nota |
|---|---|---|---|---|---|
| Source Serif 4 (in uso) | sì | sì | sì | sì | completo |
| Source Sans 3 (in uso) | no | no | sì | sì | probabili cifre predefinite già tabellari [DA VERIFICARE a schermo] |
| Literata | sì | sì | sì | sì | serif nato per la lettura su schermo |
| Newsreader | sì | – | – | sì | |
| Inter | sì | – | – | sì | indicato da OpenAI come default da evitare |
| Public Sans | sì | sì | sì | sì | |
| Atkinson Hyperlegible Next | sì | – | – | sì | progettato per leggibilità |
| Instrument Sans, Figtree, Geist | sì | – | – | sì | |
| IBM Plex Sans | no | sì | sì | no | probabili cifre predefinite tabellari |
| Fraunces | no | – | – | no | sconsigliato per dati numerici |

Tutti includono il sottoinsieme latino con le lettere accentate italiane (à è é ì ò ù).

→ Per il portale:
- **Mantenere Source Serif 4 + Source Sans 3**: sono una superfamiglia (stesso progettista, metriche armoniche), già self-hosted, coerente con gli appunti; cambiare font non è la leva principale del problema. Alternative valide se si vuole più carattere: Literata (titoli) + Public Sans o Atkinson Hyperlegible Next (interfaccia).
- Serif **solo** per titoli di pagina, nomi delle materie e numeri-chiave grandi (voto, media); sans per tutta l'interfaccia (navigazione, etichette, tabelle, bottoni).
- Scala proposta (corpo 16 px su mobile, 17 px possibile come Apple): 13 (solo metadati) · 14 · 16 · 18 · 22 · 28 · 36; non più di 5–6 dimensioni effettive per schermata; pesi 400/500/600 (serif titoli 600).
- Interlinea: corpo sans 1.5; serif di lettura 1.55–1.6; titoli 1.15–1.25.
- `font-variant-numeric: tabular-nums lining-nums` su voti, CFU, medie, date, conteggi, tabelle; numeri allineati a destra in colonna.
- Formati italiani: `Intl.NumberFormat('it-IT')` (virgola decimale: "27,4"), date "12 gen 2027", spazio non separabile tra numero e unità ("6&nbsp;CFU").
- `text-wrap: balance` sui titoli, `text-wrap: pretty` sui paragrafi; `hyphens: auto` con `lang="it"` solo nei testi lunghi, non nelle etichette.
- Niente MAIUSCOLO per etichette (Anthropic, impeccable); se proprio servono, +5–12% di spaziatura e meno di una riga (Butterick).

---

## Regole sintetiche da applicare al portale (ordinate per impatto)

1. **Ogni schermata ha un'azione primaria sola e visibile in cima** ("Studia il capitolo 4 di Sociologia", "Ripassa 12 flashcard"): un bottone pieno con l'accento; il resto è secondario (Refactoring UI, OpenAI, Duolingo "segui il passo successivo").
2. **Tre superfici tonali in chiaro**: fondo pagina appena tinto, card bianche, zone incassate un gradino sotto. Mai card bianche su fondo bianco (M3, Radix, Geist).
3. **Testo secondario scuro**: ≥ 4.5:1 obbligatorio, obiettivo 7:1 su mobile; vietati grigi chiari per testo da leggere (WCAG 1.4.3, Apple, M3 tono 30, Linear).
4. **Un solo sistema di elevazione**: card = bordo tenue senza ombra; ombra a due livelli solo per elementi sopraelevati (menu, foglio, barra in basso). Niente "ghost card" (impeccable, Vercel, Refactoring UI).
5. **Meno card, più spazio**: raggruppare per prossimità; card solo per oggetti cliccabili/interattivi (una materia, un esame, un capitolo); **mai card dentro card** (OpenAI, impeccable, Duolingo 2026).
6. **Accento blu inchiostro con ruoli fissi**: azione, link, selezione, "oggi/corrente". Mai per decorazione o per testo non interattivo; tinta chiara della stessa famiglia per gli stati selezionati (Apple, impeccable, M3 primaryContainer).
7. **Colori di stato semantici** (superato, prenotato, in scadenza, mancante) sempre accompagnati da testo o icona (WCAG 1.4.1).
8. **Barra di navigazione inferiore su mobile con 3–5 voci, icona + etichetta**, voce corrente evidenziata; sidebar solo ≥ 1024 px; navigazione identica su tutte le pagine (M3, ui-ux-pro-max).
9. **Target ≥ 44×44 px** su mobile, ≥ 8 px tra target; input ≥ 16 px; `touch-action: manipulation` (Apple, Vercel, WCAG 2.5.8 come minimo legale 24 px).
10. **Token semantici in OKLCH**, chiaro e scuro progettati insieme; il tema scuro non è un'inversione; segue `prefers-color-scheme` (Apple, impeccable, Linear).
11. **Gerarchia con dimensione + peso + colore**, non con box: squint test su ogni schermata (impeccable, Apple).
12. **Ritmo di spaziatura a base 4** con alternanza netta: gruppi stretti (4–8), separazione tra sezioni ampia (32–48); più spazio sopra un titolo che sotto (impeccable, Refactoring UI).
13. **Cifre tabellari e allineate a destra** per voti, CFU, medie, date in colonna; formati italiani con virgola decimale (Vercel, MDN, Refactoring UI).
14. **Serif solo per titoli e numeri-chiave, sans per l'interfaccia**; massimo 5–6 dimensioni per schermata; corpo 16 px, interlinea 1.5 (Anthropic, Apple, OpenAI).
15. **Libretto su mobile**: prima colonna = nome dell'esame, solo 2–3 colonne essenziali (voto, CFU, data); dettagli in espansione; intestazioni fisse se la lista è lunga (NN/g).
16. **Percorso come sequenza vera**: numerazione e linea di avanzamento ammesse perché il contenuto è una sequenza; posizione corrente sempre raggiungibile con un tocco (Anthropic, Duolingo).
17. **Navigazione attenuata, contenuto in primo piano**: barre e menu un gradino più tenui dell'area di lavoro (Linear 2026).
18. **Stati vuoti con azione** ("Nessun esame prenotato — Prenota il prossimo") e stati di errore che dicono come rimediare; progettare vuoto/scarso/denso/errore (Anthropic, Vercel).
19. **Bordi in tre intensità con ruoli**: decorativo (tenue ma visibile), controllo (≥ 3:1), focus (forte). Anelli di focus con `:focus-visible` non coperti dalle barre sticky (Radix, WCAG 1.4.11 e 2.4.11).
20. **Etichette dei bottoni = azione esatta**, stesso nome in tutto il flusso ("Prenota esame" → "Esame prenotato") (Anthropic, Vercel).
21. **Testo ridotto all'osso**: niente frasi di contorno, niente etichette "Campo: valore" se il dato si spiega da solo ("27/30", "6 CFU") (OpenAI, Refactoring UI).
22. **Icone SVG da un'unica famiglia**, stesso tratto, dimensioni come token; niente emoji come icone (ui-ux-pro-max, impeccable).
23. **Movimento solo in risposta ad azioni** (aprire, espandere, confermare), `transform`/`opacity`, mai `transition: all`, rispetto di `prefers-reduced-motion` (Anthropic, Vercel).
24. **PWA rifinita**: `theme-color` uguale al fondo in entrambi i temi, `color-scheme`, `env(safe-area-inset-*)` per la barra inferiore, selezione testo e scrollbar nei colori del tema (Vercel, impeccable).
25. **Stato nell'URL** (filtri del libretto, tab della scheda materia) e link veri `<a>`; il tasto indietro ripristina scroll e filtri (Vercel, ui-ux-pro-max).
26. **Skeleton identici al contenuto** e con ritardo ~200 ms, per i dati della coda/agente (Vercel).
27. **Raggi coerenti**: card 12–16 px, controlli più piccoli, pillole solo per chip/badge; raggio interno ≤ esterno (impeccable, Vercel).
28. **Verificare a schermo, da telefono, in luce forte**: i colori appaiono più scuri e smorzati; testare entrambi i temi e lo zoom al 200% (Apple).

## Anti-pattern da evitare

- **Kit SaaS**: griglia di card identiche arrotondate con la stessa ombra grigia `rgba(0,0,0,.1)` e lo stesso raggio ovunque (Anthropic, OpenAI, impeccable).
- **Card bianche su fondo bianco** separate solo da un bordo grigio chiarissimo: è la causa tipica del "chiaro slavato" (sintesi da M3/Radix/Geist).
- **Ghost card**: bordo 1 px + ombra ampia e morbida insieme (impeccable).
- **Testo grigio chiaro** per informazioni utili (date, CFU, sottotitoli); grigio generico su fondi colorati (WCAG, Apple, Refactoring UI, impeccable).
- **Grigio + un solo accento** come unica strategia cromatica (impeccable, Operate).
- **Eyebrow MAIUSCOLO** spaziato sopra ogni titolo; etichette tutte maiuscole; meta "A · B · C"; "→" in coda a link e bottoni (Anthropic, impeccable).
- **Hero-metric**: numero gigante + etichetta piccola + statistiche + accento in gradiente come apertura della dashboard (Anthropic, impeccable). Il voto medio può essere grande solo se è davvero l'informazione che guida l'azione.
- **Card annidate**, mosaici di card, bordi spessi su ogni regione, **bordo colorato laterale > 1 px** su card e avvisi (impeccable, OpenAI).
- **Sparkline, anelli di progresso e indicatori decorativi** che non rispondono a "cosa faccio adesso" (impeccable).
- **Emoji come icone**, icone miste piene/contorno allo stesso livello (ui-ux-pro-max, impeccable).
- **Colore come unico segnale** di stato (superato/non superato) (WCAG 1.4.1, Apple).
- **Tema scuro per inversione** del chiaro, o un tema scelto "per categoria" e non per scena d'uso (Apple, impeccable).
- **Animazioni d'ingresso su ogni sezione**, hover animati su ogni card, `transition: all` (Anthropic, Vercel).
- **Numerazioni 01/02/03 decorative** dove non c'è sequenza (Anthropic, impeccable).
- **Bottoni o div usati come link**, stato non riflesso nell'URL (Vercel).
- **Target piccoli** (icone 16–20 px senza area estesa) e input < 16 px su iOS (Apple, Vercel).
- **Barre sticky che coprono il focus** o i contenuti senza padding di compensazione (WCAG 2.4.11, ui-ux-pro-max).
- **Testi di contorno e di marketing** nell'interfaccia di lavoro; etichette vaghe ("Continua", "Invia") (OpenAI, Anthropic).
- **Cliché AI**: fondo crema #F4F1EA + accento terracotta; quasi-nero + accento acido; layout da giornale con filetti e raggio zero (Anthropic). Nota: il vincolo "serif per i titoli" del portale è legittimo, ma va abbinato a superfici fredde/neutre e all'accento inchiostro, non al crema-terracotta.
