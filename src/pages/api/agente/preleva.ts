import type { APIRoute } from 'astro';
import { RichiestaPreleva } from '../../../shared/schemi';
import { preleva, registraBattito } from '../../../lib/coda';
import { soloAgente, leggi, json } from './_comune';

export const prerender = false;

/** L'agente si annuncia (battito) e prende il prossimo lavoro, se c'è. */
export const POST: APIRoute = async (ctx) => {
  const negato = soloAgente(ctx);
  if (negato) return negato;
  const dati = await leggi(ctx.request, RichiestaPreleva);
  if (dati instanceof Response) return dati;

  const id = `${dati.agente}@${dati.host}`;
  await registraBattito(id, dati.versione);
  const lavoro = await preleva(id, dati.tipi);
  return json({ lavoro });
};
