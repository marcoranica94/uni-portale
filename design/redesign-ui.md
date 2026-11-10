# Redesign dell'interfaccia — proposta (task t041)

Basata su `ricerca-ui.md` (fonti: skill frontend-design di Anthropic, Vercel Web Interface Guidelines, ui-ux-pro-max, impeccable, Apple HIG, Material 3, WCAG 2.2, Radix, Geist, Linear, Duolingo, NN/g) e sugli screenshot del portale del 10/11/2026.

## Diagnosi: perché oggi è "osceno"

| Problema | Dove | Regola violata |
| --- | --- | --- |
| Tutto è una card bianca con bordo grigio su un fondo quasi bianco: superfici indistinguibili, chiaro slavato | ovunque | tre superfici tonali; niente card bianche su bianco |
| Nessuna azione vera: "Prossima azione" è testo senza pulsante; metà schermo vuota | Oggi | una sola azione primaria, visibile in cima |
| Etichette MAIUSCOLE spaziate sopra ogni titolo, meta "A · B · C" | ovunque | anti-pattern eyebrow |
| 24 righe identiche "Da sostenere" con badge: rumore che non dice nulla | Libretto | testo ridotto all'osso; colore solo dove c'è lavoro |
| Su telefono ogni esame è una scheda alta con quattro "–" | Libretto mobile | tabelle mobile: 2-3 colonne essenziali |
| Il modulo "Registra un voto" occupa la parte alta prima dei dati | Libretto | azione primaria come pulsante, dettaglio in espansione |
| Pulsante primario disabilitato ("Simula l'esame") che sembra rotto | Materia | stati vuoti con azione; niente controlli morti |
| Bordo colorato laterale spesso sulla testata e sulle voci del percorso | Materia, Percorso | anti-pattern bordo laterale > 1 px |
| Metadati di sistema in vista (`claude@macbook-pro-di-marco.home`) | Kit | testo di contorno |
| Sidebar e contenuto con lo stesso peso; il colore d'accento non ha ruoli chiari | navigazione | navigazione attenuata; accento = azione/selezione/corrente |

## Direzione: "quaderno d'inchiostro"

Un'interfaccia da strumento di lavoro, non da landing page: neutri freddi appena tinti verso il blu inchiostro, carta bianca per gli oggetti con cui si interagisce, inchiostro per le azioni. Serif solo dove c'è "contenuto da studio" (titoli di pagina, nomi delle materie, numeri chiave), sans per tutto il resto.

### Token (OKLCH, chiaro e scuro progettati insieme)

| Ruolo | Chiaro | Scuro |
| --- | --- | --- |
| Fondo pagina | `oklch(0.968 0.006 255)` grigio-blu appena percettibile | `oklch(0.17 0.012 255)` |
| Superficie (card, pannelli) | bianco | `oklch(0.215 0.014 255)` |
| Superficie incassata (campi, righe) | `oklch(0.945 0.008 255)` | `oklch(0.19 0.012 255)` |
| Barra di navigazione | `oklch(0.94 0.01 255)` (un gradino sotto il fondo) | `oklch(0.15 0.012 255)` |
| Testo primario | `oklch(0.22 0.02 260)` (≥ 12:1) | `oklch(0.94 0.008 255)` |
| Testo secondario | `oklch(0.42 0.02 260)` (≥ 7:1) | `oklch(0.76 0.015 255)` |
| Bordo decorativo | `oklch(0.90 0.008 255)` | `oklch(0.30 0.014 255)` |
| Bordo dei controlli (≥ 3:1) | `oklch(0.66 0.015 255)` | `oklch(0.50 0.015 255)` |
| Accento (azioni, link, selezione) | `oklch(0.42 0.13 258)` ≈ #1F4E8C | `oklch(0.74 0.10 255)` |
| Accento tenue (selezionato, "oggi") | `oklch(0.93 0.03 255)` | `oklch(0.29 0.05 255)` |

Colori di stato (superato, da sostenere, debole, informazione) e colori delle materie restano, sempre con testo o icona.

### Regole di composizione

1. **Elevazione unica**: card = bianco su fondo tinto + bordo decorativo 1 px, nessuna ombra. Ombra a due livelli solo per la barra in basso su telefono e per i menu.
2. **Raggi**: card 12 px, controlli 8 px, pillole solo per badge.
3. **Etichette in frase normale**, niente maiuscolo spaziato; metadati senza "·" a catena quando bastano due dati.
4. **Liste al posto di griglie di card** per materie ed esami: una superficie con righe separate da divisori, ogni riga un link.
5. **Ritmo**: gruppi stretti (8-12 px), sezioni distanti (32-48 px).
6. **Cifre tabellari** su voti, CFU, medie, date; formati italiani.
7. **Navigazione**: barra in basso sotto 1024 px (con ombra e safe area), barra laterale sopra; scelta del tema (Automatico / Chiaro / Scuro) ricordata sul dispositivo.

### Pagina per pagina

- **Oggi**: in cima un blocco "Adesso" con il prossimo passo concreto e un pulsante pieno (oggi: riprendere la materia con il kit pronto; più avanti la simulazione o il ripasso). Sotto: materie in corso come lista compatta; una riga di stato (CFU, agente).
- **Percorso**: anni come sezioni con avanzamento CFU; l'anno in corso aperto, gli altri richiudibili; voci in lista con pallino colore materia + nome + tipo d'esame + CFU; niente badge "Da seguire" ripetuti.
- **Libretto**: riepilogo compatto in una riga; pulsante primario "Registra un voto" che apre il modulo; esami raggruppati per anno; lo stato compare solo per gli esami superati (voto in evidenza), gli altri restano neutri. Su telefono: nome a sinistra, voto e CFU a destra, una riga per esame.
- **Materia**: testata sobria (etichetta colore + nome in serif + dati essenziali); azione primaria "Apri gli appunti", secondaria "Scarica PDF"; capitoli in lista; esame e programma in sezioni richiudibili; kit d'esame in un pannello con stato in parole ("Pronto, 42 nuclei · aggiornato agli appunti attuali") e senza il nome tecnico del PC.
- **Agente**: stessi token; comandi in blocchi copiabili.

### Verifica

Screenshot di ogni pagina in chiaro e scuro, a 390 px e 1440 px; contrasto controllato sui token; nessuno scorrimento orizzontale.
