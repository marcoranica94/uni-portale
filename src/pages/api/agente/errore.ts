import type { APIRoute } from 'astro';
import { RichiestaErrore } from '../../../shared/schemi';
import { getLavoro, segnaErrore } from '../../../lib/coda';
import { soloAgente, leggi, json } from './_comune';

export const prerender = false;

/** L'agente segnala un errore: il lavoro torna in coda (fino a 3 tentativi) o resta in errore. */
export const POST: APIRoute = async (ctx) => {
  const negato = soloAgente(ctx);
  if (negato) return negato;
  const dati = await leggi(ctx.request, RichiestaErrore);
  if (dati instanceof Response) return dati;
  const lavoro = await getLavoro(dati.id);
  if (!lavoro) return json({ errore: 'Lavoro inesistente.' }, 404);
  await segnaErrore(dati.id, dati.messaggio, dati.ritenta);
  return json({ ok: true });
};
