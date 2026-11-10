import type { APIRoute } from 'astro';
import { RichiestaCompleta, RisultatoKit } from '../../../shared/schemi';
import { completa, getLavoro, salvaKit } from '../../../lib/coda';
import { soloAgente, leggi, json } from './_comune';

export const prerender = false;

/** L'agente consegna il risultato di un lavoro; il formato dipende dal tipo. */
export const POST: APIRoute = async (ctx) => {
  const negato = soloAgente(ctx);
  if (negato) return negato;
  const dati = await leggi(ctx.request, RichiestaCompleta);
  if (dati instanceof Response) return dati;

  const lavoro = await getLavoro(dati.id);
  if (!lavoro) return json({ errore: 'Lavoro inesistente.' }, 404);
  if (lavoro.stato !== 'in_corso') return json({ errore: `Lavoro nello stato "${lavoro.stato}".` }, 409);

  if (lavoro.tipo === 'kit') {
    const r = RisultatoKit.safeParse(dati.risultato);
    if (!r.success || !lavoro.codice) return json({ errore: 'Risultato del kit non valido.', dettagli: r.error?.issues.slice(0, 5) }, 400);
    await salvaKit(lavoro.codice, r.data);
    await completa(lavoro.id, r.data);
    return json({ ok: true });
  }

  return json({ errore: `Tipo di lavoro "${lavoro.tipo}" non ancora gestito.` }, 400);
};
