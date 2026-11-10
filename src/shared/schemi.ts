/**
 * Schemi condivisi tra il sito (Cloudflare Worker) e l'agente locale (uni-agent).
 * Regola per gli schemi destinati ai modelli: tutti i campi obbligatori, `nullable` invece di
 * `optional`, nessuna proprietà aggiuntiva. È il formato "rigido" richiesto da Codex e
 * accettato da Claude e Antigravity.
 */
import { z } from 'zod';

// ---------- Kit d'esame: ciò che il modello deve produrre ----------

export const NucleoKit = z
  .object({
    id: z.string().describe('Identificativo progressivo, es. "N01"'),
    titolo: z.string(),
    file: z.string().describe('File degli appunti da cui nasce, es. "02-lo-stato.html"'),
    pagine: z.string().describe('Pagine degli appunti, es. "Pagina 3-4"; stringa vuota se non indicate'),
    concetti: z.array(z.object({ termine: z.string(), definizione: z.string() }).strict()),
    autoriTesi: z.array(z.object({ autore: z.string(), tesi: z.string() }).strict()),
    nessi: z.array(z.string()).describe('Cause, conseguenze, confronti ed eccezioni da saper spiegare'),
    date: z.array(z.string()).describe('Date e cronologie rilevanti, con l\'evento'),
    puntiChiave: z.array(z.string()).describe('Rubrica: ciò che una risposta completa deve contenere'),
    erroriTipici: z.array(z.string()),
    domandeTipo: z.array(z.string()),
  })
  .strict();

export const KitModello = z
  .object({
    sintesi: z.string().describe('Di che cosa tratta la materia, in 3-5 frasi'),
    formatoEsame: z
      .object({
        tipo: z.enum(['scritto', 'orale', 'misto']),
        descrizione: z.string(),
        numeroDomande: z.number().int().nullable(),
        durataMinuti: z.number().int().nullable(),
      })
      .strict(),
    nuclei: z.array(NucleoKit).min(1),
    collegamenti: z.array(z.string()).describe('Collegamenti tra capitoli utili all\'esame'),
  })
  .strict();
export type KitModello = z.infer<typeof KitModello>;

// ---------- Coda dei lavori: API tra sito e agente ----------

export const TipoLavoro = z.enum(['kit', 'domande', 'correzione']);
export type TipoLavoro = z.infer<typeof TipoLavoro>;

export const NomeAgente = z.enum(['claude', 'codex', 'agy']);
export type NomeAgente = z.infer<typeof NomeAgente>;

export const RichiestaPreleva = z.object({
  agente: NomeAgente,
  host: z.string().min(1).max(100),
  versione: z.string().max(40),
  tipi: z.array(TipoLavoro).min(1),
});
export type RichiestaPreleva = z.infer<typeof RichiestaPreleva>;

export const Lavoro = z.object({
  id: z.string(),
  tipo: TipoLavoro,
  codice: z.string().nullable(),
  richiesta: z.record(z.string(), z.unknown()),
  tentativi: z.number(),
});
export type Lavoro = z.infer<typeof Lavoro>;

export const RispostaPreleva = z.object({ lavoro: Lavoro.nullable() });

/** Risultato di un lavoro "kit": il kit vive nel repository, al sito arrivano solo i metadati. */
export const RisultatoKit = z.object({
  impronta: z.string().min(8),
  nuclei: z.number().int().min(1),
  commit: z.string().nullable(),
  generato: z.string(),
  agente: z.string(),
  file: z.string(),
});
export type RisultatoKit = z.infer<typeof RisultatoKit>;

export const RichiestaCompleta = z.object({
  id: z.string(),
  risultato: z.unknown(),
});

export const RichiestaErrore = z.object({
  id: z.string(),
  messaggio: z.string().max(2000),
  ritenta: z.boolean(),
});

// ---------- Banca di domande (lavoro "domande") ----------

export const DomandaModello = z
  .object({
    nucleo: z.string().describe('Id del nucleo del kit, es. "N07"'),
    tipo: z.enum(['multipla', 'aperta']),
    testo: z.string(),
    opzioni: z.array(z.string()).describe('Quattro opzioni per la multipla; vuoto per l\'aperta'),
    corretta: z.number().int().nullable().describe('Indice (da 0) dell\'opzione giusta; null per l\'aperta'),
    spiegazione: z.string().describe('Perché la risposta giusta è giusta e le altre no (multipla); vuoto per l\'aperta'),
    puntiChiave: z.array(z.string()).describe('Rubrica dell\'aperta: elementi verificabili; vuoto per la multipla'),
    rispostaModello: z.string().describe('Risposta modello breve per l\'aperta; vuoto per la multipla'),
  })
  .strict();
export type DomandaModello = z.infer<typeof DomandaModello>;

export const DomandeModello = z.object({ domande: z.array(DomandaModello).min(1) }).strict();

export const DomandaCompleta = DomandaModello.extend({ file: z.string(), pagine: z.string() });
export type DomandaCompleta = z.infer<typeof DomandaCompleta>;

export const RisultatoDomande = z.object({
  lotto: z.string(),
  agente: z.string(),
  domande: z.array(DomandaCompleta).min(1),
});
export type RisultatoDomande = z.infer<typeof RisultatoDomande>;

// ---------- Correzione delle risposte aperte (lavoro "correzione") ----------

/** Ciò che il sito mette nella richiesta del lavoro di correzione. */
export const RichiestaCorrezione = z.object({
  simulazione: z.string(),
  codice: z.string(),
  risposte: z.array(
    z.object({
      ordine: z.number().int(),
      nucleo: z.string(),
      domanda: z.string(),
      puntiChiave: z.array(z.string()),
      rispostaModello: z.string(),
      risposta: z.string(),
      massimo: z.number(),
    }),
  ),
});
export type RichiestaCorrezione = z.infer<typeof RichiestaCorrezione>;

export const CorrezioneModello = z
  .object({
    valutazioni: z.array(
      z
        .object({
          ordine: z.number().int(),
          punti: z.number().describe('Da 0 al massimo indicato per la domanda, anche con mezzi punti'),
          coperti: z.array(z.string()).describe('Punti chiave presenti nella risposta'),
          mancanti: z.array(z.string()).describe('Punti chiave assenti o sbagliati'),
          errori: z.array(z.string()).describe('Errori concettuali o attribuzioni sbagliate'),
          commento: z.string().describe('Due-tre frasi su come migliorare la risposta'),
        })
        .strict(),
    ),
    giudizio: z.string().describe('Giudizio complessivo in 2-3 frasi, in italiano'),
  })
  .strict();
export type CorrezioneModello = z.infer<typeof CorrezioneModello>;

export const RisultatoCorrezione = CorrezioneModello.extend({ agente: z.string() });
export type RisultatoCorrezione = z.infer<typeof RisultatoCorrezione>;
