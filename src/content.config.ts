import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse } from 'yaml';

/**
 * Piano di studi ufficiale (percorso/piano-di-studi.yaml).
 * Ogni insegnamento diventa una voce con id = codice UniBg (o uno slug se il codice manca).
 */
const insegnamenti = defineCollection({
  loader: file('./percorso/piano-di-studi.yaml', {
    parser: (testo) => {
      const piano = parse(testo) as { insegnamenti: Record<string, unknown>[] };
      return piano.insegnamenti.map((voce, indice) => ({
        id: (voce.codice as string | null) ?? `voce-${indice + 1}`,
        ordine: indice,
        ...voce,
      }));
    },
  }),
  schema: z.object({
    ordine: z.number(),
    anno: z.number(),
    semestre: z.string().nullable(),
    nome: z.string(),
    codice: z.string().nullable(),
    cfu: z.number(),
    docenti: z.array(z.string()).nullable().optional(),
    tipologia: z.string().nullable().optional(),
    alternative: z.union([z.array(z.string()), z.string()]).nullable().optional(),
    lingua: z.string().nullable().optional(),
    esame: z
      .object({
        tipo: z.string().nullable(),
        dettagli: z.string().nullable().optional(),
        nota: z.string().optional(),
      })
      .nullable()
      .optional(),
    programma: z.array(z.string()).nullable().optional(),
    obiettivi: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
  }),
});

export const collections = { insegnamenti };
