import type { APIRoute } from 'astro';
import { z } from 'zod';
import { NomeAgente } from '../../../shared/schemi';
import { registraBattito } from '../../../lib/coda';
import { soloAgente, leggi, json } from './_comune';

export const prerender = false;

const Battito = z.object({ agente: NomeAgente, host: z.string().min(1).max(100), versione: z.string().max(40) });

/** L'agente segnala di essere acceso senza prendere lavori (usato da "uni-agent verifica"). */
export const POST: APIRoute = async (ctx) => {
  const negato = soloAgente(ctx);
  if (negato) return negato;
  const dati = await leggi(ctx.request, Battito);
  if (dati instanceof Response) return dati;
  await registraBattito(`${dati.agente}@${dati.host}`, dati.versione);
  return json({ ok: true, agente: `${dati.agente}@${dati.host}` });
};
