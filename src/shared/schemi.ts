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
